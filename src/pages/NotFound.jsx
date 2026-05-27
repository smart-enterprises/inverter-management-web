import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="text-center">
        <h1 className="text-9xl font-extrabold text-blue-500 tracking-widest">404</h1>
        <p className="text-2xl md:text-3xl font-semibold mt-6 text-gray-800">
          Oops! Page Not Found
        </p>
        <p className="mt-4 text-gray-500">
          The page you’re looking for doesn’t exist or was moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg shadow transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
