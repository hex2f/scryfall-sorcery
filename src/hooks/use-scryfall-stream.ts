import { useState, useCallback, useRef } from "react";
import { SSE, type _SSEvent } from "sse.js";

export type ToolCall = {
  id: string;
  name: string;
  timestamp: number;
};

export type StreamState = {
  isStreaming: boolean;
  currentThought: string;
  toolCalls: ToolCall[];
  finalQuery: string | null;
  showCursor: boolean;
};

const API_URL = "https://1414.gpu.mainly.cloud/stream_run_payload";

export function useScryfallStream() {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    currentThought: "",
    toolCalls: [],
    finalQuery: null,
    showCursor: false,
  });
  const sseRef = useRef<SSE | null>(null);

  const search = useCallback((query: string) => {
    setState({
      isStreaming: true,
      currentThought: "",
      toolCalls: [],
      finalQuery: null,
      showCursor: true,
    });

    const sse = new SSE(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify({ prompt: query }),
    });
    sseRef.current = sse;

    sse.addEventListener("delta", (event: _SSEvent) => {
      const data = JSON.parse(event.data);
      setState((prev) => ({
        ...prev,
        showCursor: false,
        currentThought: prev.currentThought + data,
      }));
    });

    sse.addEventListener("set", (event: _SSEvent) => {
      const data = JSON.parse(event.data);
      setState((prev) => ({ ...prev, currentThought: data }));
    });

    sse.addEventListener("work", () => {
      setState((prev) => ({ ...prev, showCursor: true }));
    });

    sse.addEventListener("tool_call", (event: _SSEvent) => {
      const data = JSON.parse(event.data);
      const toolName = data.name ?? data;

      if (toolName === "present_final_answer") {
        const scryfallQuery = data.arguments?.query ?? data.query ?? data.arguments ?? "";
        setState((prev) => ({ ...prev, finalQuery: scryfallQuery }));
        // Brief delay then redirect
        setTimeout(() => {
          window.open(
            `https://scryfall.com/search?q=${encodeURIComponent(scryfallQuery)}`,
            "_blank"
          );
        }, 1500);
      } else {
        setState((prev) => ({
          ...prev,
          toolCalls: [
            ...prev.toolCalls,
            { id: Math.random().toString(36).slice(2), name: toolName, timestamp: Date.now() },
          ],
        }));
      }
    });

    sse.addEventListener("readystatechange", () => {
      if (sse.readyState >= 2) {
        setState((prev) => ({ ...prev, isStreaming: false, showCursor: false }));
      }
    });

    sse.stream();
  }, []);

  const cancel = useCallback(() => {
    sseRef.current?.close();
    setState((prev) => ({ ...prev, isStreaming: false, showCursor: false }));
  }, []);

  return { ...state, search, cancel };
}
