import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { createServiceClient } from "@/lib/supabase/server";
import type { SourceDocument } from "@/lib/types";

const MATCH_THRESHOLD = 0.3;
export const MATCH_COUNT = 8;

interface RetrievalResult {
  contextText: string;
  documents: SourceDocument[];
}

export async function retrieveContext(query: string): Promise<RetrievalResult> {
  const supabase = createServiceClient();

  // Generate embedding for the query
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });

  // Query pgvector for similar chunks
  const { data: chunks, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    console.error("RAG retrieval failed:", error.message);
    return { contextText: "", documents: [] };
  }

  if (!chunks || chunks.length === 0) {
    return { contextText: "", documents: [] };
  }

  // Deduplicate documents
  const seenDocs = new Map<string, SourceDocument>();
  const contextParts: string[] = [];

  for (const chunk of chunks) {
    contextParts.push(chunk.content);

    if (!seenDocs.has(chunk.document_id)) {
      seenDocs.set(chunk.document_id, {
        id: chunk.document_id,
        title: chunk.document_title,
        file_type: chunk.document_file_type,
        file_size_bytes: chunk.document_file_size_bytes,
      });
    }
  }

  return {
    contextText: contextParts.join("\n\n---\n\n"),
    documents: Array.from(seenDocs.values()),
  };
}
