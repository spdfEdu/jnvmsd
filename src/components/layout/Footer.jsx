import { Link } from "react-router-dom";

/** Render the footer view. */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { name: "Home", path: "/homepage" },
    { name: "Reunion 2026", path: "/reunion-2026" },
    { name: "Batches", path: "/batches" },
    { name: "Directory", path: "/directory" },
    { name: "Blood Donors", path: "/blood-donors" },
    { name: "Events", path: "/events" },
    { name: "Gallery", path: "/gallery" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const socialLinks = [
    { name: "Facebook", href: "https://facebook.com" },
    { name: "LinkedIn", href: "https://linkedin.com" },
    { name: "Instagram", href: "https://instagram.com" },
    { name: "Twitter / X", href: "https://twitter.com" },
    { name: "YouTube", href: "https://youtube.com" },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="w-full h-full bg-[#eef0f2] text-gray-700 relative overflow-hidden flex flex-col justify-between p-6 lg:p-10">
      <div className="max-w-[1580px] w-full h-full mx-auto px-6 md:px-20 py-16 relative">
        {/* Decorative Globe GIF */}
        <img
          src={`${import.meta.env.BASE_URL}images/whitecirculerglobe.gif`}
          alt=""
          className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 pointer-events-none select-none z-0 opacity-80"
        />

        {/* Top Section */}
        <div className="grid md:grid-cols-2 gap-12 relative z-10">
          {/* Left Column */}
          <div>
            <Link to="/homepage" className="flex items-center gap-2 mb-6 w-fit">
              <div className="w-5 h-5 bg-black rotate-45"></div>
              <span className="font-semibold text-lg text-black tracking-tight">
                Alumni Association
              </span>
            </Link>

            <h1 className="text-4xl md:text-6xl font-semibold leading-tight mb-6 text-black">
              We would love to hear <br /> from you.
            </h1>

            <p className="text-gray-500 mb-6 max-w-md text-base leading-relaxed">
              Feel free to reach out to reconnect with batchmates, share updates, or collaborate on alumni initiatives.
            </p>

            <p className="mt-8 text-sm text-gray-500">
              Have questions or want to get involved? Drop us a line via email.
            </p>

            <a
              href="mailto:alumni.jnvmsd@gmail.com"
              className="font-medium mt-1 inline-block text-black hover:underline"
            >
              alumni.jnvmsd@gmail.com
            </a>
          </div>

          {/* Right Column */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
            {/* Contact us */}
            <div className="w-fit">
              <h3 className="font-semibold mb-4 text-black">Contact us</h3>
              <p className="text-sm text-gray-500 mb-1">Our Email</p>
              <a
                href="mailto:alumni.jnvmsd@gmail.com"
                className="text-[clamp(12px,2vw,16px)] text-black hover:underline font-medium block mb-4"
              >
                alumni.jnvmsd@gmail.com
              </a>

              <p className="text-sm text-gray-500 mb-1">Campus Location</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                JNV Murshidabad <br />
                West Bengal, India <br />
                742102
              </p>
            </div>

            {/* Follow us */}
            <div>
              <h3 className="font-semibold mb-4 text-black">Follow us</h3>
              <ul className="space-y-2">
                {socialLinks.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-gray-600 hover:text-black transition-colors"
                    >
                      <span>{item.name}</span>
                      <span className="text-xs">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4 text-black">Quick Links</h3>
              <ul className="space-y-2 text-gray-600">
                {navLinks.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="hover:text-black transition-colors block text-sm"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>


      </div>

      {/* Bottom Section */}
        <div className="max-w-[1580px] w-full flex flex-col md:flex-row justify-between items-center mt-16 pt-8 border-t border-gray-300/60 text-sm text-gray-500 relative z-10 gap-4">
          <p>
            © {currentYear} Alumni Association. All rights reserved •{" "}
            <Link to="/about" className="underline hover:text-black">
              Privacy Policy
            </Link>
          </p>

          <button
            onClick={scrollToTop}
            className="mt-4 md:mt-0 flex items-center gap-2 hover:text-black cursor-pointer transition-colors"
          >
            Back to the top ↑
          </button>
        </div>
    </footer>
  );
};

export default Footer;
