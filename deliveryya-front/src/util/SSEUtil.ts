/**
 * SSE (Server-Sent Events) Utility for testing employee location tracking
 * Gets JWT token from localStorage and establishes SSE connection
 */

export class SSEUtil {
  private static eventSource: EventSource | null = null;
  private static abortController: AbortController | null = null;

  static isAbortedError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { name?: string; message?: string };
    return candidate.name === "AbortError";
  }

  /**
   * Connect to SSE endpoint with JWT authentication (EventSource method)
   * Limited: EventSource doesn't support custom headers
   * @param endpoint - The SSE endpoint URL
   * @param onMessage - Callback when message is received
   * @param onError - Callback when error occurs
   */
  static connectWithJWT(
    endpoint: string,
    onMessage?: (data: any) => void,
    onError?: (error: Event) => void
  ): EventSource | null {
    try {
      // Get JWT token from localStorage
      const jwtToken = localStorage.getItem("jwtToken");

      if (!jwtToken) {
        console.error("SSE: No JWT token found in localStorage");
        return null;
      }

      console.log("SSE: Starting connection with endpoint:", endpoint);

      // Add token as Bearer token in query parameter (EventSource workaround)
      const urlWithToken = `${endpoint}${endpoint.includes("?") ? "&" : "?"}Authorization=Bearer%20${encodeURIComponent(jwtToken)}`;

      const eventSource = new EventSource(urlWithToken);
      this.eventSource = eventSource;

      eventSource.addEventListener("open", () => {
        console.log("SSE: Connection established");
      });

      eventSource.addEventListener("message", (event) => {
        console.log("SSE: Message received", event.data);
        if (onMessage) {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (e) {
            onMessage(event.data);
          }
        }
      });

      eventSource.addEventListener("error", (error) => {
        console.error("SSE: Connection error", error);
        if (onError) onError(error);
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("SSE: Connection closed");
        }
      });

      return eventSource;
    } catch (error) {
      console.error("SSE: Connection failed", error);
      return null;
    }
  }

  /**
   * Connect using Fetch API with proper Authorization header (RECOMMENDED)
   * This method supports custom headers properly
   * @param endpoint - The SSE endpoint URL
   * @param onMessage - Callback when message is received
   * @param onError - Callback when error occurs
   * @param onClose - Callback when connection closes
   */
  static async connectWithFetch(
    endpoint: string,
    onMessage?: (data: any) => void,
    onError?: (error: string) => void,
    onClose?: () => void,
    onStatus?: (status: string) => void
  ): Promise<void> {
    try {
      const jwtToken = localStorage.getItem("jwtToken");

      if (!jwtToken) {
        console.error("SSE (Fetch): No JWT token found in localStorage");
        if (onError) onError("No JWT token found");
        return;
      }

      console.log("SSE (Fetch): Starting connection with endpoint:", endpoint);

      this.abortController = new AbortController();

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${jwtToken}`,
          "Accept": "text/event-stream",
        },
        credentials: "include",
        signal: this.abortController.signal,
      });

      console.log("SSE (Fetch): Response status:", response.status);
      console.log("SSE (Fetch): Response headers:", {
        contentType: response.headers.get("content-type"),
        transferEncoding: response.headers.get("transfer-encoding"),
        connection: response.headers.get("connection"),
      });

      if (!response.ok && response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      console.log("SSE (Fetch): Connection established, reading stream...");
      if (onStatus) onStatus("connected");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasReceivedData = false;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("SSE (Fetch): Stream ended");
            if (onClose) onClose();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log("SSE (Fetch): Raw chunk received:", chunk);

          buffer += chunk;

          // Normalize newlines and process complete SSE events (separated by an empty line).
          const normalized = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          const events = normalized.split("\n\n");
          buffer = events.pop() || "";

          for (const eventText of events) {
            if (!eventText.trim()) {
              continue;
            }

            const lines = eventText.split("\n");
            const dataLines: string[] = [];

            for (const line of lines) {
              if (!line.trim()) {
                continue;
              }

              if (line.startsWith(":")) {
                if (onStatus) onStatus(line.slice(1).trim() || "keep-alive");
                continue;
              }

              if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trimStart());
                continue;
              }

              // Be tolerant to non-SSE formatted lines.
              dataLines.push(line.trim());
            }

            const payload = dataLines.join("\n").trim();
            if (!payload) {
              continue;
            }

            hasReceivedData = true;
            console.log("SSE (Fetch): Message received", payload);

            if (onMessage) {
              try {
                const parsedData = JSON.parse(payload);
                onMessage(parsedData);
              } catch (e) {
                onMessage(payload);
              }
            }
          }
        }
      } catch (streamError: unknown) {
        console.error("SSE (Fetch): Stream reading error:", streamError);
        if (SSEUtil.isAbortedError(streamError)) {
          if (onClose) onClose();
          return;
        }

        const likelyChunkedStreamClose =
          hasReceivedData &&
          streamError instanceof TypeError &&
          String(streamError.message || "").toLowerCase().includes("network");

        if (likelyChunkedStreamClose) {
          console.log("SSE (Fetch): Stream closed after data (treated as normal close)");
          if (onClose) onClose();
          return;
        }

        if (onError) {
          const message =
            streamError instanceof Error
              ? streamError.message
              : "Unknown stream error";
          onError(`Stream error: ${message}`);
        }
      }
    } catch (error: unknown) {
      if (SSEUtil.isAbortedError(error)) {
        console.log("SSE (Fetch): Connection aborted");
      } else {
        console.error("SSE (Fetch): Connection error", error);
        if (onError) {
          const message = error instanceof Error ? error.message : "Connection failed";
          onError(message || "Connection failed");
        }
      }
    }
  }

  /**
   * Disconnect from SSE
   */
  static disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      console.log("SSE: EventSource connection closed");
      this.eventSource = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      console.log("SSE (Fetch): Fetch connection closed");
      this.abortController = null;
    }
  }

  /**
   * Test connection with Fetch (recommended)
   */
  static testConnectionFetch(endpoint: string): void {
    console.log("SSE (Fetch): Testing connection to", endpoint);
    const jwtToken = localStorage.getItem("jwtToken");

    if (!jwtToken) {
      console.error("SSE: No JWT token found. Make sure you're logged in.");
      return;
    }

    console.log("SSE: JWT token found, attempting connection...");

    this.connectWithFetch(
      endpoint,
      (data) => console.log("✓ SSE Data:", data),
      (error) => console.error("✗ SSE Error:", error),
      () => console.log("Connection closed")
    );
  }

  /**
   * Test connection with EventSource
   */
  static testConnection(endpoint: string): EventSource | null {
    console.log("SSE: Testing connection to", endpoint);
    const jwtToken = localStorage.getItem("jwtToken");

    if (!jwtToken) {
      console.error("SSE: No JWT token found. Make sure you're logged in.");
      return null;
    }

    console.log("SSE: JWT token found, attempting connection...");

    return this.connectWithJWT(
      endpoint,
      (data) => console.log("✓ SSE Data:", data),
      (error) => console.error("✗ SSE Error:", error)
    );
  }
}
