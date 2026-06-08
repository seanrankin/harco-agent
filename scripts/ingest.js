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
    "Missing required env vars. Ensure OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are in .env.local",
  );
  process.exit(1);
}

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const EMBEDDING_MODEL = "text-embedding-3-small";

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

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const charSize = chunkSize * 4;
  const charOverlap = overlap * 4;
  const step = charSize - charOverlap;
  const estimatedChunks = Math.ceil(text.length / step);

  if (estimatedChunks > 50000) {
    console.warn(
      `  ⚠  Document is extremely large (${text.length} chars, ~${estimatedChunks} chunks). Truncating to first 10M chars.`,
    );
    text = text.slice(0, 10_000_000);
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + charSize, text.length);
    chunks.push(text.slice(start, end));
    start += step;
    if (start >= text.length) break;
  }

  return chunks;
}

async function generateEmbeddings(texts) {
  const results = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const { statusCode, body } = await request(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "Accept-Encoding": "identity",
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
        dispatcher: agent,
      },
    );

    const text = await body.text();
    if (statusCode >= 400) {
      throw new Error(`OpenAI embedding error: ${text}`);
    }

    const data = JSON.parse(text);
    results.push(...data.data.map((d) => d.embedding));
  }
  return results;
}

// --- File Parsers ---

async function parseDocx(filePath) {
  const buffer = await readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function parsePdf(filePath) {
  const buffer = await readFile(filePath);
  const data = await pdf(buffer);
  return data.text;
}

function stripEmailNoise(text) {
  // Remove image CID references like [cid:image001.gif@01DCF764.4F68C9D0]
  text = text.replace(/\[cid:[^\]]+\]/g, "");

  // Remove URL markup like www.example.com<http://www.example.com/>
  text = text.replace(/(\S+)<https?:\/\/[^>]+>/g, "$1");

  // Remove long To: lines with multiple email addresses
  text = text.replace(/^To:.*(?:\n(?=\S).*@.*)*$/gm, "");

  // Remove Sent: lines
  text = text.replace(/^Sent:.*$/gm, "");

  // Remove signature blocks (name + title patterns before forwarded content)
  const lines = text.split("\n");
  const cleaned = [];
  let inSignature = false;

  for (const line of lines) {
    if (
      /^(John D\. Fralick|National Sales Manager|Harco Fittings LLC|\(\d{3}\) \d{3}-\d{4})/.test(
        line.trim(),
      )
    ) {
      inSignature = true;
      continue;
    }
    if (/^From:/.test(line.trim()) && inSignature) {
      inSignature = false;
    }
    if (!inSignature) {
      cleaned.push(line);
    }
  }

  // Remove excessive blank lines
  return cleaned
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
      (a.filename.endsWith(".docx") ||
        a.filename.endsWith(".doc") ||
        a.filename.endsWith(".pdf")),
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
        (filename.endsWith(".docx") ||
          filename.endsWith(".doc") ||
          filename.endsWith(".pdf"))
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

// --- Main Ingestion ---

async function ingestFile(filePath, title, fileType) {
  const fileBuffer = await readFile(filePath);
  const fileStat = await stat(filePath);
  const contentHash = hashContent(fileBuffer);

  // Check if already ingested
  const existing = await supabaseRest(
    `documents?content_hash=eq.${contentHash}&select=id`,
    { method: "GET" },
  );

  if (existing.length > 0) {
    // Verify chunks exist too (handles incomplete prior runs)
    const existingChunks = await supabaseRest(
      `document_chunks?document_id=eq.${existing[0].id}&select=id&limit=1`,
      { method: "GET" },
    );
    if (existingChunks.length > 0) {
      console.log(`  ⏭  Already ingested: ${title}`);
      return;
    }
    // Incomplete, delete stale record and re-process
    console.log(`  🔄 Incomplete ingestion found, re-processing: ${title}`);
    await supabaseRest(`documents?id=eq.${existing[0].id}`, {
      method: "DELETE",
    });
  }

  // Extract text
  let text = "";
  if (fileType === "docx" || fileType === "doc") {
    text = await parseDocx(filePath);
  } else if (fileType === "pdf") {
    text = await parsePdf(filePath);
  } else if (fileType === "eml") {
    const result = await parseEml(filePath);
    text = result.text;
  } else if (fileType === "msg") {
    const result = await parseMsg(filePath);
    text = result.text;
  } else {
    console.log(`  ⚠  Unsupported file type: ${fileType}, skipping`);
    return;
  }

  if (!text || text.trim().length < 10) {
    console.log(`  ⚠  No extractable text in: ${title}, skipping`);
    return;
  }

  // Upload original file to Supabase Storage
  const storagePath = `${contentHash}/${basename(filePath)}`;
  const contentTypes = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    pdf: "application/pdf",
    eml: "message/rfc822",
    msg: "application/vnd.ms-outlook",
  };

  await supabaseStorageUpload(
    storagePath,
    fileBuffer,
    contentTypes[fileType] || "application/octet-stream",
  );

  // Insert document record
  const [doc] = await supabaseRest("documents", {
    method: "POST",
    body: JSON.stringify({
      title,
      file_type: fileType,
      file_size_bytes: fileStat.size,
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

  for (let i = 0; i < chunkRows.length; i += 20) {
    const batch = chunkRows.slice(i, i + 20);
    await supabaseRest("document_chunks", {
      method: "POST",
      body: JSON.stringify(batch),
    });
  }

  console.log(`  ✓  Ingested: ${title} (${chunks.length} chunks)`);
}

async function ingestAttachment(attachment, emailSubject) {
  const { filename, content } = attachment;
  const ext = extname(filename).toLowerCase().slice(1);
  const title = basename(filename, extname(filename));
  const contentHash = hashContent(content);

  // Check if already ingested
  const existing = await supabaseRest(
    `documents?content_hash=eq.${contentHash}&select=id`,
    { method: "GET" },
  );

  if (existing.length > 0) {
    const existingChunks = await supabaseRest(
      `document_chunks?document_id=eq.${existing[0].id}&select=id&limit=1`,
      { method: "GET" },
    );
    if (existingChunks.length > 0) {
      console.log(`  ⏭  Already ingested attachment: ${filename}`);
      return;
    }
    await supabaseRest(`documents?id=eq.${existing[0].id}`, {
      method: "DELETE",
    });
  }

  // Extract text from attachment buffer
  let text = "";
  if (ext === "docx" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer: content });
    text = result.value;
  } else if (ext === "pdf") {
    const data = await pdf(content);
    text = data.text;
  } else {
    console.log(`  ⚠  Unsupported attachment type: ${ext}, skipping`);
    return;
  }

  if (!text || text.trim().length < 10) {
    console.log(
      `  ⚠  No extractable text in attachment: ${filename}, skipping`,
    );
    return;
  }

  // Upload to storage
  const storagePath = `${contentHash}/${filename}`;
  const contentTypes = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    pdf: "application/pdf",
  };

  await supabaseStorageUpload(
    storagePath,
    content,
    contentTypes[ext] || "application/octet-stream",
  );

  // Insert document record
  const [doc] = await supabaseRest("documents", {
    method: "POST",
    body: JSON.stringify({
      title,
      file_type: ext,
      file_size_bytes: content.length,
      storage_path: storagePath,
      content_hash: contentHash,
    }),
  });

  // Chunk and embed
  const chunks = chunkText(text);
  console.log(
    `  📄 Attachment: ${chunks.length} chunks, generating embeddings...`,
  );

  const embeddings = await generateEmbeddings(chunks);

  const chunkRows = chunks.map((chunkContent, i) => ({
    document_id: doc.id,
    content: chunkContent,
    embedding: JSON.stringify(embeddings[i]),
    chunk_index: i,
  }));

  for (let i = 0; i < chunkRows.length; i += 20) {
    const batch = chunkRows.slice(i, i + 20);
    await supabaseRest("document_chunks", {
      method: "POST",
      body: JSON.stringify(batch),
    });
  }

  console.log(
    `  ✓  Ingested attachment: ${filename} (${chunks.length} chunks)`,
  );
}

async function ingestDirectory(dirPath) {
  const entries = await readdir(dirPath);
  const supported = entries.filter((f) => {
    const ext = extname(f).toLowerCase();
    return [".docx", ".doc", ".pdf", ".eml", ".msg"].includes(ext);
  });

  if (supported.length === 0) {
    console.error(
      `No supported files (.docx, .doc, .pdf, .eml, .msg) found in ${dirPath}`,
    );
    process.exit(1);
  }

  console.log(`\nFound ${supported.length} files to process in ${dirPath}\n`);

  for (const file of supported) {
    const filePath = join(dirPath, file);
    const ext = extname(file).toLowerCase().slice(1);
    const title = basename(file, extname(file));

    console.log(`Processing: ${file}`);

    if (ext === "eml") {
      const { text, attachments, subject } = await parseEml(filePath);
      await ingestFile(filePath, subject, "eml");

      for (const attachment of attachments) {
        console.log(`  📎 Processing attachment: ${attachment.filename}`);
        await ingestAttachment(attachment, subject);
      }
    } else if (ext === "msg") {
      const { text, attachments, subject } = await parseMsg(filePath);
      await ingestFile(filePath, subject, "msg");

      for (const attachment of attachments) {
        console.log(`  📎 Processing attachment: ${attachment.filename}`);
        await ingestAttachment(attachment, subject);
      }
    } else {
      await ingestFile(filePath, title, ext);
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
