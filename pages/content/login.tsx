import Head from "next/head";
import Router from "next/router";
import { FormEvent, useState } from "react";
import Layout from "../../components/layout";
import { ApiResponse, User } from "../../types/api/types";

export default function Login() {
  const [loginError, setLoginError] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const res = (await (
      await fetch("/api/content/login", {
        method: "POST",
        body: JSON.stringify({
          username: event.currentTarget.username.value,
          password: event.currentTarget.password.value,
        }),
      })
    ).json()) as ApiResponse<User>;

    if (res.isSuccess) {
      Router.push("/content/posts");
    } else {
      setLoginError(res.message);
    }
  }

  return (
    <>
      <Head>
        <title>Jorge Martinez - Login</title>
      </Head>
      <Layout>
        <div className="w-1/2 mx-auto">
          <form onSubmit={handleSubmit}>
            {loginError && (
              <div className="text-center my-2 text-red-500 dark:text-red-300">
                {loginError}
              </div>
            )}
            <div>
              <label htmlFor="username" className="block">
                Username
              </label>
              <input
                id="username"
                autoComplete="username"
                required={true}
                name="username"
                className="my-3 w-full dark:focus:ring-stone-400 dark:focus:ring-2 dark:focus:border-0 dark:bg-stone-800 dark:text-white rounded-md"
                type="text"
              ></input>
            </div>
            <div>
              <label htmlFor="password" className="block">
                Password
              </label>
              <input
                autoComplete="current-password"
                id="password"
                required={true}
                type="password"
                name="password"
                className="my-3 w-full dark:focus:ring-stone-400 dark:focus:ring-2 dark:focus:border-0 dark:bg-stone-800 dark:text-white rounded-md"
              ></input>
              <button
                type="submit"
                className="px-10 flex shrink items-center justify-center text-white dark:bg-stone-900 bg-blue-500 hover:bg-blue-700 rounded-lg dark:border dark:border-gray-500 w-11 h-11 my-5 hover:border-0 hover:ring-2 dark:ring-stone-400"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </>
  );
}
