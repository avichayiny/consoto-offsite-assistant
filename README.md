# Consoto Offsite Assistant 

A multi-agent chat assistant designed to help Consoto's HR team plan offsites quickly and efficiently, built according to a multi-agent orchestrated architecture.

## Architecture
The system consists of a Node.js/Express orchestrator that routes tasks to specialist agents:
- **Destination Scout Agent** (Open-Meteo, OSM)
- **Weather & Calendar Agent** (Nager.Date, Hebcal)
- **Budget & Policy Agent** (Consoto internal data, Frankfurter API)
- **Itinerary Writer Agent**

Calculations and policy enforcements are handled strictly in code, not by the LLM. 

## Quickstart (Run in 5 minutes)
1. Clone the repository.
2. Copy `.env.example` to `.env` and add your `GEMINI_API_KEY` and `GROQ_API_KEY`.
3. Run the following command:
   ```bash
   docker compose up --build
   ```

## Trade-offs
- OSM / Overpass API Unreliability: During development, the main Overpass FOSSGIS server actively blocked requests despite strictly following their usage policies (including proper User-Agent headers). Alternative mirror servers suffered from constant timeouts. Solution: I kept the exact API integration logic pointing to the main server, but wrapped it in a deterministic mock-data fallback. If the API fails, the fallback triggers seamlessly so the UI never freezes and the flow remains robust.
- In-Memory State vs. Database: Conversation history is currently stored in-memory in the Node.js backend using a Map keyed by sessionId. This is lightweight and perfect for a local demo, but would require an external database for production scaling.

## What I would do next
- Fixes the issue with OSM, perhaps by using a different tool for relevant data.
- Parallel Agent Execution: For complex queries, allow the Orchestrator to dispatch tasks to the Scout and Budget agents (for example) in parallel rather than sequentially, reducing overall response latency.
