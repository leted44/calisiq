import { ImageResponse } from "next/og";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const dimension = parseInt(size, 10) || 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0f19 0%, #0891b2 100%)",
        }}
      >
        <span
          style={{
            fontSize: dimension * 0.45,
            color: "white",
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          CQ
        </span>
      </div>
    ),
    { width: dimension, height: dimension }
  );
}
