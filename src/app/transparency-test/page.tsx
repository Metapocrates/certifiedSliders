export default function TransparencyTest() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-10"
      style={{
        backgroundImage:
          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
        backgroundSize: "40px 40px",
        backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
      }}
    >
      <div className="flex items-center gap-8">
        <div className="text-sm text-app/80">favicon-32x32.png</div>
        <img src="/favicon-32x32.png" width={64} height={64} alt="favicon 32" />
        <div className="text-sm text-app/80">apple-touch-icon.png</div>
        <img src="/apple-touch-icon.png" width={128} height={128} alt="apple icon" />
      </div>
    </div>
  );
}
