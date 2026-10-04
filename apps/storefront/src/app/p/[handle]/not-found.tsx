import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-h3 font-bold">Không tìm thấy sản phẩm</h1>
      <p className="text-muted-foreground">Sản phẩm có thể đã ngừng bán hoặc đường dẫn không đúng.</p>
      <Link href="/c/all" className="inline-flex h-11 items-center rounded-md bg-primary px-5 font-semibold text-on-primary">Xem tất cả sản phẩm</Link>
    </div>
  );
}
