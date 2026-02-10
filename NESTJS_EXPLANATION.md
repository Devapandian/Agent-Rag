# Samatva Assistant: NestJS Chat Service Explanation

This document explains the architecture and logic of the **Samatva Assistant**, a virtual assistant built with **NestJS**, **Google Gemini 2.0 Flash**, and the **Vercel AI SDK**.

## project Overview
The application is a credit-counselling chatbot designed to help users with queries related to credit scores (CIBIL), loans, and personal finance in India. It uses a **Tool-Calling (Function Calling)** pattern to ensure the AI provides accurate information from a pre-defined FAQ bank.

---

## 1. Request Flow (HTTP)
The application follows the standard NestJS Controller-Service pattern:

1. **Client Request**: A POST request is sent to `http://localhost:3007/chats/query` with a JSON body containing `{"query": "..."}`.
2. **Validation**: The `PromptMessageDto` ensures the query is a non-empty string.
3. **Controller**: `ChatsController` receives the request and calls the `prompt()` method in `ChatsService`.
4. **Service**: `ChatsService` coordinates the AI logic.
5. **AI Logic**: 
   - It initializes the Gemini model.
   - It builds a strict **System Prompt**.
   - It executes `generateText()` with access to the `faqTool`.
6. **Response**: The final text response is returned to the client.

---

## 2. Core Components

### `ChatsService` (The Brain)
This is where the AI integration lives.
- **Model Initialization**: Uses `@ai-sdk/google` to connect to `gemini-2.0-flash`.
- **System Prompt**: Defines the persona ("Samatva Assistant") and strictly instructs the AI to use the FAQ tool for any financial questions.
- **Tool Mapping**: Maps the `faqTool` from `ChatsTools` to the AI process.
- **Step Limit**: Uses `stepCountIs(5)` to prevent infinite tool-calling loops.

### `ChatsTools` (The Knowledge Base)
This file defines the **FAQ Tool**. 
- **Tool Specification**: Uses the `tool` function from the AI SDK.
- **Description**: Tells the AI *when* to use this tool ("Get answers to FAQs...").
- **Execution**: When the AI decides to call the tool, it executes the `execute` block, which currently returns a static (but very detailed) list of 35 FAQs.
- **Zod Schema**: Defines the expected input from the AI (`question` string).

### `ChatsController` & `PromptMessageDto`
- **Controller**: Exposes the `POST /chats/query` endpoint.
- **DTO**: Uses `class-validator` to ensure incoming data is clean.

### `main.ts` (Entry Point)
- Configures security headers with `helmet`.
- Enables `CORS` so frontend apps can connect.
- Sets up `ValidationPipe` for automatic request validation.
- Listens on port `3007`.

---

## 3. Key AI Features

### Tool Calling (Function Calling)
Unlike simple chatbots, this service doesn't just "guess" an answer. If you ask "How can I improve my CIBIL score?", the AI sees the query, recognizes it matches the `faqTool` description, calls the tool to get the factual answer, and then formats that answer for you.

### Rigid Guardrails
The system prompt contains strict instructions:
- **Greet warmly** if it's a greeting.
- **Use the tool** for EVERYTHING financial.
- **Reject unrelated topics**: If you ask about "cooking recipes", it is programmed to politely redirect you to financial topics.

---

## 4. Code Structure
```text
src/
├── chats.controller.ts    # API Endpoints
├── chats.service.ts       # AI Logic & Model Config
├── chats.tool.ts          # FAQ Knowledge Base & Tool Definition
├── dto/
│   └── prompt-message.dto.ts # Data Validation
└── main.ts                # Server Setup
```
