/**
 * NeuroLink Proxy Server Test Utility
 *
 * A local HTTP proxy server for testing NeuroLink's enterprise proxy support.
 * This server intercepts CONNECT requests and logs them for validation.
 *
 * Usage:
 *   node tools/testing/proxy_server.js
 *
 * Then in another terminal:
 *   node tools/testing/test_proxy.js
 *
 * The proxy server will log all intercepted connections from NeuroLink.
 */

import http from "http";
import net from "net";
import { URL } from "url";

const proxy = http.createServer((req, res) => {
  console.log(
    `[${new Date().toISOString()}] Proxy received a non-CONNECT request for: ${req.url}`,
  );
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("This proxy only handles CONNECT requests for HTTPS.");
});

proxy.on("connect", (req, clientSocket, head) => {
  const { port, hostname } = new URL(`http://${req.url}`);
  console.log(
    `[${new Date().toISOString()}] ---> Intercepted CONNECT request to: ${hostname}:${port}`,
  );

  const serverSocket = net.connect(port || 80, hostname, () => {
    console.log(
      `[${new Date().toISOString()}] ---> Connection to ${hostname} established.`,
    );
    clientSocket.write(
      "HTTP/1.1 200 Connection Established\r\n" +
        "Proxy-agent: NeuroLink-Test-Proxy\r\n" +
        "\r\n",
    );
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on("error", (err) => {
    console.error(`[${new Date().toISOString()}] Proxy to server error:`, err);
    clientSocket.end();
  });

  clientSocket.on("error", (err) => {
    console.error(`[${new Date().toISOString()}] Client to proxy error:`, err);
    serverSocket.end();
  });
});

proxy.listen(8080, () => {
  console.log("==================================================");
  console.log("  Local Proxy Server for NeuroLink Testing");
  console.log("  Listening on http://localhost:8080");
  console.log("==================================================");
  console.log("Waiting for requests...");
});
