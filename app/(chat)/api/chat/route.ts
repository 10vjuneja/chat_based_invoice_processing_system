import {
    Message,
    streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import {
    deleteChatById,
    getChatById,
    saveChat,
    saveMessages,
    saveInvoice,
    saveInvoiceLineItem,
    getLastNInvoices,
    saveTokenUsage,
} from '@/lib/db/queries';
import {
    generateUUID,
    getMostRecentUserMessage,
    sanitizeResponseMessages,
} from '@/lib/utils';
import { getCachedPrompt, savePromptToCache } from '@/lib/ai/prompt-cache';

import * as fs from 'fs';
import { google } from "@ai-sdk/google";
import { generateText } from 'ai';
import { generateTitleFromUserMessage } from '../../actions';
import { z } from 'zod';
import { createHash } from 'crypto';

export const maxDuration = 60;

export async function POST(req: Request) {
    const {
        id,
        messages,
    }: { id: string; messages: Array<Message>; selectedChatModel: string } =
        await req.json();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new Response('Unauthorized', { status: 401 });
    }
    // Print all messages
    console.log("Request Messages", messages);
    const userMessage = getMostRecentUserMessage(messages);

    // No user message found
    if (!userMessage) {
        return new Response('No user message found', { status: 400 });
    }
    console.log("User message received", userMessage.content);

    // Check if the last message has attachments
    var hasAttachments = false;
    var fileName = "";
    var fileType = "";
    if (userMessage?.experimental_attachments?.length) {
        hasAttachments = true;
        fileName = userMessage?.experimental_attachments?.at(-1)?.name ?? '';
        fileType = userMessage?.experimental_attachments?.at(-1)?.contentType ?? '';
        console.log("Attachment found.File name", fileName);
        console.log("File type", fileType);
    } else {
        console.log("No attachment found");
    }

    const chat = await getChatById({ id });

    if (!chat) {
        const title = await generateTitleFromUserMessage({ message: userMessage });
        await saveChat({ id, userId: session.user.id, title });
    }

    await saveMessages({
        messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
    });


    const result = await streamText({
        model: google('gemini-1.5-flash'),
        system: `\n
            - You help users process and manage invoices.
            - Every time the user asks to show invoices, always call the listInvoices tool, even if you have already done so recently.
            - Every time the user asks to show token usage stats, calculate the token usage even if you have already done so recently.
            - After every tool call, show the result to the user in a structured format.
            - Keep your responses clear and concise.
          `,
        messages: messages,
        tools: {
            processInvoice: {
                description: "Process a new invoice from an uploaded document",
                parameters: z.object({
                }),
                execute: async () => {
                    if (!hasAttachments) {
                        return { error: "There is no attached invoice to process. Please attach an invoice and try again." };
                    }
                    console.log("Processing invoice");

                    // Create a hash of the prompt and file content for caching
                    const promptHash = createHash('sha256')
                        .update('Is this document an invoice? Please respond with only "yes" or "no".')
                        .update(fileName ? fs.readFileSync('.' + fileName) : Buffer.from(''))
                        .digest('hex');

                    // Try to get cached response
                    const cachedResponse = await getCachedPrompt(promptHash, 'gemini-1.5-flash');

                    let isInvoiceCheck;
                    if (cachedResponse) {
                        console.log("Using cached response for invoice check");
                        isInvoiceCheck = {
                            text: cachedResponse.response,
                            usage: {
                                promptTokens: cachedResponse.promptTokens,
                                completionTokens: cachedResponse.completionTokens,
                                totalTokens: cachedResponse.totalTokens,
                            }
                        };
                    } else {
                        // First verify if it's an invoice
                        isInvoiceCheck = await generateText({
                            model: google('gemini-1.5-flash'),
                            messages: [{
                                role: 'user',
                                content: [{
                                    type: 'text',
                                    text: 'Is this document an invoice? Please respond with only "yes" or "no".',
                                }, {
                                    type: 'file',
                                    data: fileName ? fs.readFileSync('.' + fileName) : Buffer.from(''),
                                    mimeType: fileType,
                                }],
                            }],
                        });

                        // Save to cache
                        await savePromptToCache({
                            promptHash,
                            response: isInvoiceCheck.text,
                            model: 'gemini-1.5-flash',
                            promptTokens: isInvoiceCheck.usage?.promptTokens || 0,
                            completionTokens: isInvoiceCheck.usage?.completionTokens || 0,
                            totalTokens: isInvoiceCheck.usage?.totalTokens || 0,
                        });
                    }

                    console.log("Is invoice check", isInvoiceCheck.text);

                    if (isInvoiceCheck.text.toLowerCase().trim() !== 'yes') {
                        return { error: "This document does not appear to be an invoice." };
                    }

                    // Extract invoice information
                    const invoicePromptHash = createHash('sha256')
                        .update(`Extract the following information from this invoice and output it in this JSON format:
                        {
                            "customerName": "string",
                            "vendorName": "string",
                            "invoiceNumber": "string",
                            "invoiceDate": "YYYY-MM-DD",
                            "dueDate": "YYYY-MM-DD",
                            "totalAmount": "string",
                            "currency": "string (e.g. USD, EUR, GBP)",
                            "lineItems": [
                                {
                                    "description": "string",
                                    "quantity": "string",
                                    "unitPrice": "string",
                                    "amount": "string"
                                }
                            ]
                        }`)
                        .update(fileName ? fs.readFileSync('.' + fileName) : Buffer.from(''))
                        .digest('hex');

                    // Try to get cached response
                    const cachedInvoiceResponse = await getCachedPrompt(invoicePromptHash, 'gemini-1.5-flash');

                    let invoiceInfo;
                    if (cachedInvoiceResponse) {
                        console.log("Using cached response for invoice extraction");
                        invoiceInfo = {
                            text: cachedInvoiceResponse.response,
                            usage: {
                                promptTokens: cachedInvoiceResponse.promptTokens,
                                completionTokens: cachedInvoiceResponse.completionTokens,
                                totalTokens: cachedInvoiceResponse.totalTokens,
                            }
                        };
                    } else {
                        invoiceInfo = await generateText({
                            model: google('gemini-1.5-flash'),
                            messages: [
                                {
                                    role: 'user',
                                    content: [
                                        {
                                            type: 'text',
                                            text: `Extract the following information from this invoice and output it in this JSON format:
                                            {
                                                "customerName": "string",
                                                "vendorName": "string",
                                                "invoiceNumber": "string",
                                                "invoiceDate": "YYYY-MM-DD",
                                                "dueDate": "YYYY-MM-DD",
                                                "totalAmount": "string",
                                                "currency": "string (e.g. USD, EUR, GBP)",
                                                "lineItems": [
                                                    {
                                                        "description": "string",
                                                        "quantity": "string",
                                                        "unitPrice": "string",
                                                        "amount": "string"
                                                    }
                                                ]
                                            }`,
                                        },
                                        {
                                            type: 'file',
                                            data: fileName ? fs.readFileSync('.' + fileName) : Buffer.from(''),
                                            mimeType: fileType,
                                        },
                                    ]
                                },
                            ],
                        });

                        // Save to cache
                        await savePromptToCache({
                            promptHash: invoicePromptHash,
                            response: invoiceInfo.text,
                            model: 'gemini-1.5-flash',
                            promptTokens: invoiceInfo.usage?.promptTokens || 0,
                            completionTokens: invoiceInfo.usage?.completionTokens || 0,
                            totalTokens: invoiceInfo.usage?.totalTokens || 0,
                        });
                    }

                    console.log("Raw invoice info response:", invoiceInfo);
                    const invoiceInfoText = invoiceInfo.text;
                    console.log("Processed invoice info:", invoiceInfoText);

                    interface InvoiceData {
                        customerName: string;
                        vendorName: string;
                        invoiceNumber: string;
                        invoiceDate: string;
                        dueDate: string;
                        totalAmount: string;
                        currency: string;
                        lineItems: Array<{
                            description: string;
                            quantity: string;
                            unitPrice: string;
                            amount: string;
                        }>;
                    }

                    var invoiceData: InvoiceData;
                    const jsonStart = invoiceInfoText.indexOf('{');
                    const jsonEnd = invoiceInfoText.lastIndexOf('}') + 1;
                    const jsonStr = invoiceInfoText.slice(jsonStart, jsonEnd);
                    console.log("Extracted JSON string:", jsonStr);
                    invoiceData = JSON.parse(jsonStr);
                    console.log("Parsed invoice data:", invoiceData);
                    const invoiceId = generateUUID();

                    // Save invoice header
                    try {
                        await saveInvoice({
                            id: invoiceId,
                            chatId: id,
                            customerName: invoiceData.customerName,
                            vendorName: invoiceData.vendorName,
                            invoiceNumber: invoiceData.invoiceNumber,
                            invoiceDate: new Date(invoiceData.invoiceDate),
                            dueDate: new Date(invoiceData.dueDate),
                            totalAmount: invoiceData.totalAmount,
                            currency: invoiceData.currency || 'USD', // Default to USD if currency not found
                            filePath: fileName,
                        });

                        // Save line items
                        for (const item of invoiceData.lineItems) {
                            await saveInvoiceLineItem({
                                id: generateUUID(),
                                invoiceId,
                                description: item.description,
                                quantity: item.quantity || "1", // Default to "1" if quantity is null
                                unitPrice: item.unitPrice,
                                amount: item.amount,
                            });
                        }

                        // Save token usage for invoice verification
                        await saveTokenUsage({
                            id: generateUUID(),
                            invoiceId: invoiceId,
                            model: 'gemini-1.5-flash',
                            promptTokens: (isInvoiceCheck.usage?.promptTokens || 0) + (invoiceInfo.usage?.promptTokens || 0),
                            completionTokens: (isInvoiceCheck.usage?.completionTokens || 0) + (invoiceInfo.usage?.completionTokens || 0),
                            totalTokens: (isInvoiceCheck.usage?.totalTokens || 0) + (invoiceInfo.usage?.totalTokens || 0),
                        });

                        return {
                            success: true,
                            invoiceId,
                            message: "✅ Invoice processed successfully! \nInvoice Number: " + invoiceData.invoiceNumber + " \nVendor Name: " + invoiceData.vendorName + " \nAmount: " + invoiceData.totalAmount + ' ' + invoiceData.currency
                        };
                    } catch (error) {
                        if (error instanceof Error && error.message === 'DUPLICATE_INVOICE') {
                            return {
                                error: `This invoice has already been processed. Here are the details of the existing invoice:
- Vendor: ${invoiceData.vendorName}
- Invoice Number: ${invoiceData.invoiceNumber}
- Amount: ${invoiceData.totalAmount} ${invoiceData.currency}
- Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}
- Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}
`
                            };
                        }
                        return {
                            error: "Failed to process invoice. Please ensure the document is a valid invoice."
                        };
                    }
                },
            },
            showTokenUsage: {
                description: "Show token usage statistics and savings",
                parameters: z.object({}),
                execute: async () => {
                    return {
                        component: {
                            type: "token-usage-stats",
                            props: {}
                        }
                    };
                },
            },
            listInvoices: {
                description: "List last N processed invoices",
                parameters: z.object({
                    num_invoices: z.coerce
                        .number()
                        .transform(val => {
                            const num = Number(val);
                            if (isNaN(num)) return 10;
                            return Math.min(Math.max(num, 1), 100);
                        })
                        .optional()
                        .default(10)
                        .describe("Number of invoices to list")
                }),
                execute: async ({ num_invoices }) => {
                    const invoices = await getLastNInvoices(num_invoices);
                    return {
                        invoices,
                        component: {
                            type: "invoice-table",
                            props: {
                                invoices
                            }
                        }
                    };
                },
            },
        },
        onFinish: async ({ response, reasoning }) => {
            if (session.user?.id) {
                try {
                    const sanitizedResponseMessages = sanitizeResponseMessages({
                        messages: response.messages,
                        reasoning,
                    });

                    await saveMessages({
                        messages: sanitizedResponseMessages.map((message) => {
                            return {
                                id: message.id,
                                chatId: id,
                                role: message.role,
                                content: message.content,
                                createdAt: new Date(),
                            };
                        }),
                    });
                } catch (error) {
                    console.error('Failed to save chat');
                }
            }
        },
        experimental_telemetry: {
            isEnabled: true,
            functionId: "stream-text",
        },
    });

    return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return new Response('Not Found', { status: 404 });
    }

    const session = await auth();

    if (!session || !session.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const chat = await getChatById({ id });

        await deleteChatById({ id });

        return new Response('Chat deleted', { status: 200 });
    } catch (error) {
        return new Response('An error occurred while processing your request', {
            status: 500,
        });
    }
}


