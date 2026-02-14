# Scryfall Natural Language Search Generator

A clean, minimal interface that converts natural language into Scryfall search syntax using your own LLM backend, showing the AI's thought process in real-time.

## Page: Search Interface

**Search Input**

- A centered, prominent text input where the user types natural language queries (e.g., "red creatures with flying that cost 3 or less")
- Submit button / Enter key to initiate the search
- Input disabled while the LLM is processing

**AI Reasoning Panel**

- Appears below the search box once a query is submitted
- Shows the LLM's latest thinking paragraph in real-time as it streams in (only the most recent paragraph visible, replacing previous ones)
- Displays tool calls the LLM makes as labeled chips/badges (e.g., "🔧 search_syntax_lookup", "🔧 validate_query") so the user can follow along
- Animated typing cursor while streaming
- When the LLM calls `present_final_answer`, the generated Scryfall query is briefly displayed, then the user is automatically redirected to `scryfall.com/search?q=<query>` in a new tab

**Streaming Architecture (based on your ChatThreadContext)**

- Adapted version of your `ChatThreadProvider` pattern with the `MessageContentStore` for efficient rendering
- SSE connection to your backend API
- Handles `delta`, `set`, `work` events as in your existing code
- Loops requests to the LLM until the `present_final_answer` tool call is detected in the stream
- Tool call events rendered as visual indicators in the reasoning panel

**Flow**

1. User types a natural language query and submits
2. App sends the query to your backend via SSE on URL: ([1414.gpu.mainly.cloud/stream_run_payload)](http://1414.gpu.mainly.cloud)
3. LLM streams back its reasoning — latest paragraph shown, tool calls displayed as badges
4. If the LLM hasn't called `present_final_answer`, the loop continues (backend handles this)
5. Once `present_final_answer` is called, the final Scryfall query is shown briefly and a new tab opens to Scryfall search results

**Design**

- Clean white/light background, minimal chrome
- Centered layout with comfortable max-width
- Subtle animations for streaming text and tool call badges
- Responsive for mobile and desktop