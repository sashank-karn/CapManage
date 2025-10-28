import Link from 'next/link';

const HomePage = () => {
  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">CapManage</h1>
        <p className="mt-4 text-slate-600">
          Welcome to the CapManage suite. Sign in to access capstone project workflows, faculty
          tools, and administrative oversight derived from the provided requirements workbook.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Go to Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:border-indigo-400"
          >
            Register an Account
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomePage;
