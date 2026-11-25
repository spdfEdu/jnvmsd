import videoSrc from "../../assets/backgroundvideo.mp4";

/** Render the background video view. */
const BackgroundVideo = () => {
  return (
    <div className="fixed inset-0 -z-10 h-screen w-full overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
};

export default BackgroundVideo;
