## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI (default), Anthropic, Cohere, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility


## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. 

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000/).

If needed, you can clear all tables in the db by running

```sqlite3 sqlite.db "DELETE FROM Chat; DELETE FROM Document; DELETE FROM Message; DELETE FROM Suggestion; DELETE FROM Vote; DELETE FROM Invoice; DELETE FROM InvoiceLineItem; DELETE FROM InvoiceTokenUsage; DELETE FROM PromptCache;"```

## Functionalities

### Process Invoice
- Attach a pdf or image invoice and send message to AI agent saying 'process this invoice' or similar.
- Use AI to extract key information:
    * Customer name
    * Vendor name
    * Invoice number
    * Invoice date
    * Due date
    * Amount
    * Currency
    * Line items

- Verifies that attachments are indeed invoices.
- Identifies duplicate invoices from the same vendor with the same invoice number and amount.

### Show/Edit Invoices
- You can say 'show invoices' or 'show last N invoices' or similar to view a list of already processed invoices. When N is not specified, last 10 invoices are shown by default.
- You can sort the invoices by date, amount, and vendor.
- You can edit or download each individual invoice by selecting them from the invoice table.

### Show Token Usage Stats
- You can say 'show token usage' or similar to view the token usage statistics.
- Also shows tokens saved using prompt caching. 
