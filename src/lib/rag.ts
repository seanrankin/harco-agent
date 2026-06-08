import { openai } from "@ai-sdk/openai";
import { embedMany, embed } from "ai";
import { createServiceClient } from "@/lib/supabase/server";

const MATCH_THRESHOLD = 0.3;
const MATCH_COUNT = 8;

interface RetrievedDocument {
  id: string;
  title: string;
  file_type: string;
  file_size_bytes: number;
}

interface RetrievalResult {
  contextText: string;
  documents: RetrievedDocument[];
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

  if (error || !chunks || chunks.length === 0) {
    return { contextText: "", documents: [] };
  }

  // Deduplicate documents
  const seenDocs = new Map<string, RetrievedDocument>();
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
