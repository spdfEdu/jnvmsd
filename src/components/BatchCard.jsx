
const BatchCard = ( {batch, year} ) => {
  return (
          <div className="relative rounded-2xl overflow-hidden h-[280px] group flex flex-col justify-between">
            {/* Background Image */}
            <img
              src={`${import.meta.env.BASE_URL}images/batch2018.jpg`}
              alt=""
              className="absolute left-0 top-0 inset-1 z-1 w-full h-full object-cover beat"
            />

            {/* Overlay */}
            <div className="absolute bottom-0 w-full h-[150px] bg-gradient-to-t from-black to-transparent z-2"></div>

            {/* Content */}
            <div className="relative z-10 p-6 flex flex-col justify-between h-full text-white z-2">
              <h3 className="text-2xl anton leading-tight text-black">{batch}</h3>

              <div>
                <p className="text-sm  mb-4 snpro">
                  Batch of {year} | JNV Msd
                </p>

                <div className="h-[1px] bg-white/40 mb-4"></div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 bg-white/40 rounded-full cursor-pointer"></span>
                </div>
              </div>
            </div>
          </div>
  )
}

export default BatchCard
