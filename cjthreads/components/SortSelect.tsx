"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function SortSelect({ currentSort, className }: { currentSort: string, className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select className={className} value={currentSort} onChange={handleSort}>
      <option value="newest">Newest Arrivals</option>
      <option value="price-low">Price: Low to High</option>
      <option value="price-high">Price: High to Low</option>
    </select>
  );
}
