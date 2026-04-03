export default function GamesLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fff7f7_0%,_#ffffff_24%,_#fffaf5_100%)]">
      <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-rose-100 bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(225,29,72,0.18)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="h-8 w-24 animate-pulse rounded-full bg-rose-100" />
              <div className="h-12 w-full max-w-2xl animate-pulse rounded-3xl bg-slate-200" />
              <div className="h-5 w-full max-w-3xl animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-5 w-4/5 max-w-2xl animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-rose-100" />
                  <div className="mt-4 h-4 w-24 animate-pulse rounded-xl bg-slate-200" />
                  <div className="mt-2 h-3 w-full animate-pulse rounded-xl bg-slate-100" />
                  <div className="mt-2 h-3 w-4/5 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr,1fr,0.92fr]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.16)]">
              <div className="flex items-start justify-between gap-3">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-rose-100" />
                <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="mt-6 h-6 w-2/3 animate-pulse rounded-2xl bg-slate-200" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-2xl bg-slate-100" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded-2xl bg-slate-100" />
              <div className="mt-6 h-10 w-40 animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="grid gap-6">
          <div className="rounded-[2rem] border border-rose-100 bg-white p-6 shadow-[0_24px_50px_-38px_rgba(225,29,72,0.14)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-8 w-24 animate-pulse rounded-full bg-rose-100" />
                <div className="h-7 w-72 animate-pulse rounded-2xl bg-slate-200" />
                <div className="h-4 w-[32rem] max-w-full animate-pulse rounded-2xl bg-slate-100" />
              </div>
              <div className="h-8 w-28 animate-pulse rounded-full bg-amber-100" />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr,0.98fr]">
              <div className="space-y-5">
                <div className="rounded-[1.6rem] border border-rose-100 bg-rose-50/60 p-4">
                  <div className="h-4 w-24 animate-pulse rounded-xl bg-slate-200" />
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
                        <div className="h-4 w-20 animate-pulse rounded-xl bg-slate-200" />
                        <div className="mt-3 h-3 w-full animate-pulse rounded-xl bg-slate-100" />
                        <div className="mt-2 h-3 w-4/5 animate-pulse rounded-xl bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="aspect-[1.25/1] animate-pulse rounded-[1.9rem] bg-[linear-gradient(135deg,_rgba(190,24,93,0.1)_0%,_rgba(251,146,60,0.08)_100%)]" />
                <div className="flex gap-3">
                  <div className="h-11 w-40 animate-pulse rounded-2xl bg-rose-200" />
                  <div className="h-11 w-32 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              </div>
              <div className="space-y-4 rounded-[1.75rem] border border-rose-100 bg-white p-5">
                <div className="h-6 w-40 animate-pulse rounded-2xl bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-2 w-full animate-pulse rounded-full bg-slate-100" />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 animate-pulse rounded-[1.1rem] bg-slate-200" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-4 w-20 animate-pulse rounded-xl bg-slate-200" />
                          <div className="h-3 w-16 animate-pulse rounded-xl bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
