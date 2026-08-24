"use client";

import { WhatsAppIcon } from "./icons";

/**
 * Replaces the WhatsApp button once the order exists.
 *
 * A WhatsApp sale is finished in the chat — we agree it, take payment and
 * hand the details over there — so there is nothing for the buyer to do back
 * on the site and nowhere useful to send them. This panel only confirms the
 * order landed and keeps a way into the chat if the popup never opened.
 */
export function WhatsAppHandoff({
  number,
  url,
  opened,
}: {
  number: string;
  url: string | null;
  opened: boolean;
}) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-800/60 p-4">
      <p className="text-sm font-semibold text-good">
        Order {number} is with us
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-200">
        {opened
          ? "WhatsApp is open with your order details — send the message and we'll take it from there."
          : "Your browser blocked the WhatsApp tab. Open the chat below and send us the message."}
      </p>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-[#04301c] transition-colors hover:bg-[#1fb955]"
        >
          <WhatsAppIcon className="h-4 w-4" />
          {opened ? "Open the chat again" : "Open WhatsApp"}
        </a>
      )}
    </div>
  );
}
