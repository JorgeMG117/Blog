module.exports = {
  reactStrictMode: true, // https://nextjs.org/docs/api-reference/next.config.js/react-strict-mode
  allowedDevOrigins: ["martinez.tail0073d1.ts.net"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/aaron-bos/image/upload/**",
      },
    ],
  },
};
