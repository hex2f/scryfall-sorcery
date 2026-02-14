import { useState, useCallback, useRef } from "react";
import { SSE, type _SSEvent } from "sse.js";

export type ToolCall = {
  id: string;
  name: string;
  args?: Record<string, unknown>;
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
  const finalAnswerReceivedRef = useRef(false);
  const cancelledRef = useRef(false);

  const search = useCallback((query: string) => {
    finalAnswerReceivedRef.current = false;
    cancelledRef.current = false;

    setState({
      isStreaming: true,
      currentThought: "",
      toolCalls: [],
      finalQuery: null,
      showCursor: true,
    });

    let isFirstConnect = true;
    let retryCount = 0;
    let threadId: string | undefined;
    let lastHadContent = true;
    const MAX_RETRIES = 3;

    const connect = () => {
      const payload = isFirstConnect
        ? { prompt: query, ...(threadId && { thread_id: threadId }) }
        : lastHadContent
          ? { messages: [], ...(threadId && { thread_id: threadId }) }
          : { prompt: "Continue", ...(threadId && { thread_id: threadId }) };
      const sse = new SSE(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        payload: JSON.stringify(payload),
      });
      isFirstConnect = false;
      sseRef.current = sse;

      let receivedData = false;
      let hadContent = false;

      sse.addEventListener("thread_id", (event: _SSEvent) => {
        threadId = JSON.parse(event.data);
        receivedData = true;
      });

      sse.addEventListener("delta", (event: _SSEvent) => {
        receivedData = true;
        hadContent = true;
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          showCursor: false,
          currentThought: prev.currentThought + data,
        }));
      });

      sse.addEventListener("set", (event: _SSEvent) => {
        receivedData = true;
        hadContent = true;
        const data = JSON.parse(event.data);
        setState((prev) => ({ ...prev, currentThought: data }));
      });

      sse.addEventListener("work", () => {
        receivedData = true;
        setState((prev) => ({ ...prev, showCursor: true }));
      });

      sse.addEventListener("tool_call", (event: _SSEvent) => {
        receivedData = true;
        hadContent = true;
        const data = JSON.parse(event.data);
        // Handle multiple API shapes: {name: "..."}, {function: "..."}, {function: {name: "..."}}, or plain string
        const toolName =
          typeof data === "string"
            ? data
            : data.name ??
            (typeof data.function === "string" ? data.function : data.function?.name) ??
            "unknown_tool";

        if (toolName === "present_final_answer") {
          finalAnswerReceivedRef.current = true;
          const args =
            typeof data.arguments === "string"
              ? JSON.parse(data.arguments)
              : data.arguments ?? {};
          const scryfallQuery = args.query ?? data.query ?? "";
          setState((prev) => ({ ...prev, finalQuery: scryfallQuery }));
          // Brief delay then redirect
          setTimeout(() => {
            window.open(
              `https://scryfall.com/search?q=${encodeURIComponent(scryfallQuery)}`,
              "_blank"
            );
          }, 1500);
        } else {
          const callId = data.id ?? data.call_id ?? Math.random().toString(36).slice(2);
          const args =
            typeof data.arguments === "string"
              ? JSON.parse(data.arguments)
              : data.arguments ?? undefined;
          setState((prev) => ({
            ...prev,
            toolCalls: [
              ...prev.toolCalls,
              { id: callId, name: toolName, args, timestamp: Date.now() },
            ],
          }));
        }
      });

      sse.addEventListener("readystatechange", () => {
        if (sse.readyState >= 2) {
          if (!finalAnswerReceivedRef.current && !cancelledRef.current) {
            if (receivedData) {
              // Stream worked fine, just not done yet — reconnect immediately, reset retries
              retryCount = 0;
              lastHadContent = hadContent;
              setState((prev) => ({ ...prev, showCursor: true }));
              setTimeout(connect, 500);
            } else if (retryCount >= MAX_RETRIES) {
              // Max error retries reached — give up
              cancelledRef.current = true;
              setState((prev) => ({ ...prev, isStreaming: false, showCursor: false }));
            } else {
              // Error (no data received) — reconnect with backoff
              const delay = 500 * Math.pow(2, retryCount);
              retryCount++;
              setState((prev) => ({ ...prev, showCursor: true }));
              setTimeout(connect, delay);
            }
          } else {
            setState((prev) => ({ ...prev, isStreaming: false, showCursor: false }));
          }
        }
      });

      sse.stream();
    };

    connect();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    sseRef.current?.close();
    setState((prev) => ({ ...prev, isStreaming: false, showCursor: false }));
  }, []);

  return { ...state, search, cancel };
}
