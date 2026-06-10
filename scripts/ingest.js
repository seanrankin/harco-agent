#!/usr/bin/env node

/**
 * Document Ingestion Script for Harco Knowledge Base
 *
 * Usage:
 *   node scripts/ingest.js <path-to-docs-folder>
 *
 * Supports: .docx, .doc, .pdf, .eml, .msg files
 * Requires: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, extname, basename } from "path";
import { createHash } from "crypto";
import { createRequire } from "module";
import mammoth from "mammoth";
import { simpleParser } from "mailparser";
import MsgReader from "@kenjiuno/msgreader";
import { Agent, request } from "undici";
import { chunkText, stripEmailNoise } from "../src/lib/ingest-utils.js";

// Force HTTP/1.1 to work around Node 26 HTTP/2 memory leak
const agent = new Agent({ allowH2: false });

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

// Load env vars from .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars. Ensure OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are in .env.local"
  );
  process.exit(1);
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHUNK_INSERT_BATCH_SIZE = 20;

const CONTENT_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pdf: "application/pdf",
  eml: "message/rfc822",
  msg: "application/vnd.ms-outlook",
};

// --- Supabase REST helpers ---

async function supabaseRest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const { statusCode, body } = await request(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      "Accept-Encoding": "identity",
      Prefer: "return=representation",
      ...options.headers,
    },
    body: options.body || undefined,
    dispatcher: agent,
  });
  const text = await body.text();
  if (statusCode >= 400) {
    throw new Error(`Supabase REST error (${statusCode}): ${text}`);
  }
  return JSON.parse(text);
}

async function supabaseStorageUpload(storagePath, fileBuffer, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`;
  const { statusCode, body } = await request(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: fileBuffer,
    dispatcher: agent,
  });
  const text = await body.text();
  if (statusCode >= 400) {
    throw new Error(`Storage upload error (${statusCode}): ${text}`);
  }
}

// --- Utilities ---

function hashContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function generateEmbeddings(texts) {
  const results = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const { statusCode, body } = await request("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
      dispatcher: agent,
    });

    const text = await body.text();
    if (statusCode >= 400) {
      throw new Error(`OpenAI embedding error: ${text}`);
    }

    const data = JSON.parse(text);
    results.push(...data.data.map((d) => d.embedding));
  }
  return results;
}

// --- Text Extraction ---

async function extractTextFromBuffer(buffer, fileType) {
  if (fileType === "docx" || fileType === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (fileType === "pdf") {
    const data = await pdf(buffer);
    return data.text;
  }
  return null;
}

// --- Email Parsers ---

async function parseEml(filePath) {
  const source = await readFile(filePath);
  const parsed = await simpleParser(source);

  let text = "";
  if (parsed.subject) text += `Subject: ${parsed.subject}\n\n`;
  if (parsed.text) {
    text += stripEmailNoise(parsed.text);
  } else if (parsed.html) {
    text += stripEmailNoise(parsed.html.replace(/<[^>]+>/g, " "));
  }

  const attachments = (parsed.attachments || []).filter(
    (a) =>
      a.filename &&
      (a.filename.endsWith(".docx") || a.filename.endsWith(".doc") || a.filename.endsWith(".pdf"))
  );

  return { text, attachments, subject: parsed.subject || basename(filePath) };
}

async function parseMsg(filePath) {
  const buffer = await readFile(filePath);
  const msgReader = new MsgReader(buffer);
  const fileData = msgReader.getFileData();

  let text = "";
  if (fileData.subject) text += `Subject: ${fileData.subject}\n\n`;
  if (fileData.body) text += fileData.body;

  const attachments = [];
  if (fileData.attachments && fileData.attachments.length > 0) {
    for (let i = 0; i < fileData.attachments.length; i++) {
      const att = fileData.attachments[i];
      const filename = att.fileName || att.name;
      if (
        filename &&
        (filename.endsWith(".docx") || filename.endsWith(".doc") || filename.endsWith(".pdf"))
      ) {
        const attData = msgReader.getAttachment(i);
        attachments.push({
          filename,
          content: Buffer.from(attData.content),
        });
      }
    }
  }

  return { text, attachments, subject: fileData.subject || basename(filePath) };
}

// --- Core Ingestion ---

/**
 * Ingest a single document from a buffer.
 *
 * @param {Object} params
 * @param {Buffer} params.buffer - Raw file content
 * @param {string} params.filename - Original filename (used for storage path)
 * @param {string} params.title - Display title for the document
 * @param {string} params.fileType - Extension without dot (docx, pdf, eml, msg)
 * @param {string} [params.text] - Pre-extracted text (for emails where parsing is separate)
 */
async function ingestDocument({ buffer, filename, title, fileType, text }) {
  const contentHash = hashContent(buffer);

  // Check if already ingested
  const existing = await supabaseRest(`documents?content_hash=eq.${contentHash}&select=id`, {
    method: "GET",
  });

  if (existing.length > 0) {
    const existingChunks = await supabaseRest(
      `document_chunks?document_id=eq.${existing[0].id}&select=id&limit=1`,
      { method: "GET" }
    );
    if (existingChunks.length > 0) {
      console.log(`  ⏭  Already ingested: ${title}`);
      return;
    }
    console.log(`  🔄 Incomplete ingestion found, re-processing: ${title}`);
    await supabaseRest(`documents?id=eq.${existing[0].id}`, {
      method: "DELETE",
    });
  }

  // Extract text if not pre-provided
  if (!text) {
    text = await extractTextFromBuffer(buffer, fileType);
    if (text === null) {
      console.log(`  ⚠  Unsupported file type: ${fileType}, skipping`);
      return;
    }
  }

  if (!text || text.trim().length < 10) {
    console.log(`  ⚠  No extractable text in: ${title}, skipping`);
    return;
  }

  // Upload original file to Supabase Storage
  const storagePath = `${contentHash}/${filename}`;
  await supabaseStorageUpload(
    storagePath,
    buffer,
    CONTENT_TYPES[fileType] || "application/octet-stream"
  );

  // Insert document record
  const [doc] = await supabaseRest("documents", {
    method: "POST",
    body: JSON.stringify({
      title,
      file_type: fileType,
      file_size_bytes: buffer.length,
      storage_path: storagePath,
      content_hash: contentHash,
    }),
  });

  // Chunk and embed
  const chunks = chunkText(text);
  console.log(`  📄 ${chunks.length} chunks, generating embeddings...`);

  const embeddings = await generateEmbeddings(chunks);

  // Insert chunks in batches
  const chunkRows = chunks.map((content, i) => ({
    document_id: doc.id,
    content,
    embedding: JSON.stringify(embeddings[i]),
    chunk_index: i,
  }));

  for (let i = 0; i < chunkRows.length; i += CHUNK_INSERT_BATCH_SIZE) {
    const batch = chunkRows.slice(i, i + CHUNK_INSERT_BATCH_SIZE);
    await supabaseRest("document_chunks", {
      method: "POST",
      body: JSON.stringify(batch),
    });
  }

  console.log(`  ✓  Ingested: ${title} (${chunks.length} chunks)`);
}

// --- Directory Processing ---

async function processEmailFile(filePath, ext) {
  const parser = ext === "eml" ? parseEml : parseMsg;
  const { text, attachments, subject } = await parser(filePath);
  const buffer = await readFile(filePath);

  await ingestDocument({
    buffer,
    filename: basename(filePath),
    title: subject,
    fileType: ext,
    text,
  });

  for (const attachment of attachments) {
    console.log(`  📎 Processing attachment: ${attachment.filename}`);
    const attExt = extname(attachment.filename).toLowerCase().slice(1);
    await ingestDocument({
      buffer: attachment.content,
      filename: attachment.filename,
      title: basename(attachment.filename, extname(attachment.filename)),
      fileType: attExt,
    });
  }
}

async function ingestDirectory(dirPath) {
  const entries = await readdir(dirPath);
  const supported = entries.filter((f) => {
    const ext = extname(f).toLowerCase();
    return [".docx", ".doc", ".pdf", ".eml", ".msg"].includes(ext);
  });

  if (supported.length === 0) {
    console.error(`No supported files (.docx, .doc, .pdf, .eml, .msg) found in ${dirPath}`);
    process.exit(1);
  }

  console.log(`\nFound ${supported.length} files to process in ${dirPath}\n`);

  for (const file of supported) {
    const filePath = join(dirPath, file);
    const ext = extname(file).toLowerCase().slice(1);

    console.log(`Processing: ${file}`);

    if (ext === "eml" || ext === "msg") {
      await processEmailFile(filePath, ext);
    } else {
      const buffer = await readFile(filePath);
      const title = basename(file, extname(file));
      await ingestDocument({ buffer, filename: file, title, fileType: ext });
    }
  }

  console.log("\n✓ Ingestion complete.\n");
}

// --- Entry Point ---

const dirArg = process.argv[2];
if (!dirArg) {
  console.error("Usage: node scripts/ingest.js <path-to-docs-folder>");
  process.exit(1);
}

ingestDirectory(dirArg);
