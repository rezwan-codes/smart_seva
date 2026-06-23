import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 text-slate-950">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-slate-600">The page you opened is not available in this demo.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
