import BackgroundVideo from "../components/layout/BackgroundVideo";

const Home = () => {
  return (
    <div className="w-full min-h-screen">
      <BackgroundVideo />
      <section className="home">
        <div className="w-full bg-center bg-no-repeat bg-cover border border-amber-100/60 h-[75vh] rounded-3xl relative"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/schoolimg.png)` }}>
          <div className="absolute flex flex-col left-5 bottom-5">
            <img
              src={`${import.meta.env.BASE_URL}images/circulerlogo.png`}
              alt=""
              className="lg:w-[10vw] w-[30vw]"
            />
            <span className="anton text-[clamp(20px,10vw,50px)]">
              Welcome Home,
            </span>
            <span className="anton text-[clamp(20px,10vw,50px)] text-[#082057]  backdrop-blur-sm">
              Navodayans
            </span>
            <span className="firjar text-[clamp(15px,7vw,25px)] text-[#082057]  backdrop-blur-sm">
              Come here to Learn, Go out to Serve
            </span>
          </div>
          <img
            src={`${import.meta.env.BASE_URL}images/houseflag.png`}
            alt=""
            className="absolute top-5 right-5 w-[400px]"
          />
        </div>

        {/* 2nd section */}
        <div class="max-w-7xl mx-auto  py-16 text-white">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div class="lg:col-span-7 space-y-6">
              <h2 class="firjar text-3xl sm:text-4xl font-bold tracking-tight">
                "Once a Navodayan, always a Navodayan."
              </h2>

              <div class="space-y-4 text-gray-300 text-base sm:text-lg leading-relaxed">
                <p>Same classrooms, same dormitories, same dreams.</p>
                <p>
                  Wherever life has taken us, the bond we formed at JNV stays
                  with us.
                </p>
                <p>This is the place to find each other again.</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-xl bg-amber-100/10 border border-white/15 mt-8">
                <div class="flex items-start gap-4">
                  <svg
                    class="w-8 h-8 text-gray-300 shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <div>
                    <div class="text-2xl font-bold">17</div>
                    <p class="text-xs text-gray-400 mt-1 leading-snug">
                      Batches passed till now
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <svg
                    class="w-8 h-8 text-gray-300 shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <div>
                    <div class="text-2xl font-bold">650</div>
                    <p class="text-xs text-gray-400 mt-1 leading-snug">
                      Navodaya Vidyalayas across India
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <svg
                    class="w-8 h-8 text-gray-300 shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-5C6.48 3 2 7.48 2 13s4.48 10 10 10 10-4.48 10-10S17.52 3 12 3zm0 11a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                  <div>
                    <div class="text-2xl font-bold">850</div>
                    <p class="text-xs text-gray-400 mt-1 leading-snug">
                      Alumnis from our Navodaya
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="lg:col-span-5">
              <div class="relative rounded-2xl overflow-hidden border border-white/15 aspect-[4/3] flex items-center justify-center">
                <img
                  src={`${import.meta.env.BASE_URL}images/schoolfrontimg.jpg`}
                  alt="JNV Campus"
                  class="absolute inset-0 w-full h-full object-cover opacity-40"
                />
                <div class="relative z-10 text-center">
                  <span class="block text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-gray-200">
                    SINCE
                  </span>
                  <span class="block text-4xl sm:text-5xl font-extrabold mt-2 tracking-wide">
                    2003
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*--------------- batches---------- */}

        <center className="anton font-bold text-[clamp(20px,10vw,50px)]">
          ALL BATCHES
        </center>
        {/* Cards */}
        <div className="grid grid-cols-1  lg:grid-cols-3 gap-6 ">
          {/* CARD 1 */}
          <div className="relative rounded-2xl overflow-hidden min-h-[480px] group">
            {/* Background Image */}
            <img
              src={`${import.meta.env.BASE_URL}images/batch2018.jpg`}
              alt=""
              className="absolute left-0 top-0 inset-1 z-1 w-full h-full object-cover beat"
            />

            {/* Overlay */}
            <div className="absolute bottom-0 w-full h-[150px] bg-gradient-to-t from-white to-transparent z-2"></div>

            {/* Content */}
            <div className="relative z-10 p-6 flex flex-col justify-between h-full text-black z-2">
              <h3 className="text-2xl anton leading-tight">Batch 9</h3>

              <div>
                <p className="text-sm  mb-4 snpro">
                  Batch of 2011 - 2018 | JNV Msd
                </p>

                <div className="h-[1px] bg-black/40 mb-4"></div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 bg-white/40 rounded-full cursor-pointer"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------latest events------------------ */}
        <div className="flex flex-col gap-6">
          <center className="anton font-bold text-[clamp(20px,10vw,50px)] uppercase">
            latest event
          </center>

          <center className="w-full h-full">
            <img src={`${import.meta.env.BASE_URL}images/Alapan.jpg`} alt="" className="" />
          </center>
          <center className="text-[clamp(15px,7vw,30px)] font-bold">
            JNV MURSHIDABAD ALUMNI MEET 2026
          </center>
        </div>
      </section>
    </div>
  );
};

export default Home;
