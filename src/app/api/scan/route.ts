import { NextResponse } from "next/server";
import { DEMO_PRODUCTS } from "@/data/demo-store";
import { buildRoutine } from "@/lib/routine";
import { analyzeSkin, YouCamError } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png"];

// POST multipart/form-data { image, store? } → { scan, routine }.
// The selfie is forwarded to YouCam and never stored.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const budget = Number(form?.get("maxPrice")) || undefined;

  // "Try a sample result" skips the photo and YouCam entirely (no units spent).
  if (form?.get("sample") === "1") {
    const scan = await analyzeSkin(Buffer.alloc(0), "image/jpeg", { mock: true });
    return NextResponse.json({ scan, routine: buildRoutine(scan, DEMO_PRODUCTS, { maxPricePerItem: budget }) });
  }

  const image = form?.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Attach a selfie as 'image'." }, { status: 400 });
  }
  if (!TYPES.includes(image.type)) {
    return NextResponse.json({ error: "Use a JPG or PNG photo." }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is over 10 MB." }, { status: 400 });
  }
  try {
    const scan = await analyzeSkin(Buffer.from(await image.arrayBuffer()), image.type);
    const routine = buildRoutine(scan, DEMO_PRODUCTS, { maxPricePerItem: budget });
    return NextResponse.json({ scan, routine });
  } catch (err) {
    if (err instanceof YouCamError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Skin analysis failed. Please try again." }, { status: 500 });
  }
}
