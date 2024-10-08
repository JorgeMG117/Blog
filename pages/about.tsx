import Head from "next/head";
import Layout from "../components/layout";
import AllPostsLink from "../components/all-posts-link";
import Image from "next/image";

export default function About() {
  return (
    <Layout>
      <Head>
        <title>Jorge Martinez - About</title>
      </Head>
      <section>
        <h1 className="mb-4 font-semibold text-2xl">About Me</h1>
        <hr />
        <div className="mt-4 text-center">
          <Image
            className="rounded-full m-auto"
            src="/profile.jpg"
            alt="Jorge&apos;s picture" // Changed single quote
            height="200"
            width="200"
          />
        </div>
        <p className="my-4"> 
            I am a passionate <span className="font-semibold">software engineer</span> 
            from Spain, currently pursuing a Double Master&apos;s Degree in Computer Science and 
            Applied Artificial Intelligence at the University Carlos III of Madrid. 
        </p>
        <p className="my-4">
            In addition to my studies, I am actively engaged in research at 
            the University of Madrid, where I develop tools to collect and analyze data 
            from hydrographic basins. Alongside my research, I also teach Language Processors, 
            overseeing a class of over 80 students, and managing all exercises and assignments.
        </p>
        <p className="my-4">
            My programming journey began with C++ in 2018, and since then, I&apos;ve continuously 
            expanded my skills. My strongest programming languages are Go, Python, and C++, but 
            what truly excites me is solving complex problems and understanding the technologies behind them. 
            This curiosity has led me to explore various fields such as backend development, cloud computing, 
            and machine learning. I embrace new challenges, even outside my areas of expertise, and am always eager to learn along the way.
        </p>
        <p className="my-4">
            For more details about my professional background, feel free to explore 
            my portfolio: <a href="https://jorgemartinezgil.com">Portfolio</a>
        </p>
        <p className="my-4">
          If you&apos;d like to connect, reach out via the social links at the bottom of the page. I&apos;d love to hear from you!
        </p>
        <p className="my-4">Happy reading!</p>
        <AllPostsLink text="See all my posts" />
      </section>
    </Layout>
  );
}

