import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card narrow">
      <h1>Không tìm thấy trang</h1>
      <p className="muted">Đường dẫn không tồn tại hoặc đã bị xoá.</p>
      <Link href="/" className="btn btn-primary">
        Về trang sản phẩm
      </Link>
    </div>
  );
}
