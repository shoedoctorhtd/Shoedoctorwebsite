import { createDonationRequest } from "@/lib/csr-data";
import { parsePublicDonationRequest } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

function donationResponse(
  body: Record<string, unknown>,
  status: number,
) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** Accepts the public Shoe Donation form without exposing donor data back out. */
export async function POST(request: Request) {
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return donationResponse(
      { ok: false, message: "Please check the form and try again." },
      400,
    );
  }

  let input: ReturnType<typeof parsePublicDonationRequest>;
  try {
    // Validation runs independently from persistence so its intentionally
    // user-facing feedback can be kept while persistence/internal failures remain
    // private below.
    input = parsePublicDonationRequest(requestBody);
  } catch (error) {
    return donationResponse(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Please check the form and try again.",
      },
      400,
    );
  }

  try {
    const donation = await createDonationRequest(input);
    return donationResponse(
      {
        ok: true,
        requestId: donation.requestId,
        // `reference` keeps the public form response compatible with the
        // booking form convention while `requestId` is the domain-specific key.
        reference: donation.requestId,
        message:
          "Thank you for donating. Shoe Doctor will contact you to confirm the next step.",
      },
      201,
    );
  } catch {
    return donationResponse(
      {
        ok: false,
        message:
          "We could not submit your donation request right now. Please try again shortly.",
      },
      500,
    );
  }
}
