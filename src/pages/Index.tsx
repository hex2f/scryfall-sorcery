import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScryfallStream } from "@/hooks/use-scryfall-stream";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const [query, setQuery] = useState("");
  const { isStreaming, currentThought, toolCalls, finalQuery, showCursor, search } =
    useScryfallStream();
  const thoughtRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the thought panel
  useEffect(() => {
    if (thoughtRef.current) {
      thoughtRef.current.scrollTop = thoughtRef.current.scrollHeight;
    }
  }, [currentThought]);

  // Extract only the last paragraph for display
  const lastParagraph = currentThought.trim().split(/\n\n+/).pop() ?? "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isStreaming) return;
    search(query.trim());
  };

  const hasActivity = isStreaming || currentThought || toolCalls.length > 0 || finalQuery;

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-4 pt-[20vh]">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Scryfall Search
          </h1>
          <p className="text-sm text-muted-foreground">
            Describe what cards you're looking for in plain English
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. red creatures with flying that cost 3 or less"
            disabled={isStreaming}
            className="h-11 text-base"
            autoFocus
          />
          <Button type="submit" disabled={isStreaming || !query.trim()} size="lg" className="px-4">
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Reasoning Panel */}
        <AnimatePresence>
          {hasActivity && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Tool Calls */}
              {toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {toolCalls.map((tool) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs gap-1 rounded-lg"
                      >
                        {tool.name === "scryfall_get_card_named" && tool.args?.name && (
                          <span className="text-muted-foreground text-xs font-normal">🃏 "{String(tool.args.name)}"</span>
                        )}
                        {tool.name === "scryfall_search" && tool.args?.q && (
                          <span className="text-muted-foreground text-xs font-normal">🔎 "{String(tool.args.q)}"</span>
                        )}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Thought Stream */}
              {lastParagraph && (
                <div
                  ref={thoughtRef}
                  className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground leading-relaxed max-h-48 overflow-y-auto"
                >
                  {lastParagraph}
                  {showCursor && (
                    <span className="inline-block w-1.5 h-4 bg-foreground/60 ml-0.5 animate-pulse align-text-bottom" />
                  )}
                </div>
              )}

              {/* Final Query */}
              {finalQuery && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2"
                >
                  <p className="text-xs font-medium text-muted-foreground">Generated query</p>
                  <code className="block text-sm font-mono text-foreground">{finalQuery}</code>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Opening Scryfall…
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
