import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-extrabold text-teal-500">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <Link href="/" className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Back to home</Link>
    </div>
  );
}
