import { vnd } from "@/lib/client/api";

interface Props {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode?: string | null;
}

export function CartSummaryList({ subtotal, discount, shippingFee, total, couponCode }: Props) {
  return (
    <dl>
      <dt>Tạm tính</dt>
      <dd data-testid="summary-subtotal">{vnd(subtotal)}</dd>
      <dt>Giảm giá{couponCode ? ` (${couponCode})` : ""}</dt>
      <dd data-testid="summary-discount">{discount ? `−${vnd(discount)}` : vnd(0)}</dd>
      <dt>Phí vận chuyển</dt>
      <dd data-testid="summary-shipping">{shippingFee ? vnd(shippingFee) : "Miễn phí"}</dd>
      <dt className="total-row">Tổng cộng</dt>
      <dd className="total-row" data-testid="summary-total">
        {vnd(total)}
      </dd>
    </dl>
  );
}
