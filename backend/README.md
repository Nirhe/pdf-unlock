# Backend

## Runtime requirements

- `qpdf` must be available in the runtime environment. The repository includes a bundled Linux binary at `bin/qpdf-linux-x64` that is copied into the build output under `dist/bin`. Set the `QPDF_PATH` environment variable if you prefer to point at a different executable (for example when running on macOS or Windows).

sequenceDiagram
    autonumber
    actor U as User
    participant FE as Frontend (LockPage.tsx)
    participant BE as Backend (Express App)
    participant DR as Docs Router (/api/docs)
    participant DS as Document Service (handleDocumentSubmission)
    participant QB as QuickBooks Service (createInvoice)

    Note over U,FE: User clicks "Review and Send"

    U->>FE: Click Review and Send
    FE->>FE: createReviewAndSendFormData(pdf, customerId)
    FE->>BE: POST /api/docs/send (multipart/form-data)
    BE->>DR: Route /docs/send

    DR->>DR: Multer upload.single('document')
    DR->>DR: Validate content-type, customerId, file
    DR->>DS: handleDocumentSubmission(customerId, uploaded)
    DS-->>DR: { paymentLink, invoice: { amount, memo } }

    DR->>QB: createInvoice({ customerId, amount, memo })
    QB-->>DR: { id, amount, balance, status }

    DR-->>FE: 200 { message, paymentLink, invoice: { id, amount, balance, status } }
    FE->>FE: parseSendResponse -> set paymentLink, invoiceId

    Note over FE: Start polling invoice status

    loop Every 5s until timeout or PAID
        FE->>BE: GET /api/qb/invoices/{invoiceId}
        BE->>QB: fetch invoice by id
        QB-->>BE: { invoice: { id, status, [password?] } }
        BE-->>FE: 200 { invoice: { status, [password?] } }
        FE->>FE: parseInvoiceStatusResponse -> update UI
        alt Status == PAID
            FE->>FE: setInvoiceStatus('PAID'); stop polling
        else Not paid yet
            FE->>FE: Continue polling
        end
    end

    Note over FE,U: FE shows paymentLink and updates status to PAID when completed