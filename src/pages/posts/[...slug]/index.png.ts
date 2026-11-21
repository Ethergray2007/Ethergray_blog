import type { APIRoute } from "astro";
import { getPublicPost } from "@/lib/publicPosts";
import {
  setPublicCache,
  publicReadError,
  publicNotFound,
} from "@/lib/publicCache";
import { fontData } from "astro:assets";
import satori from "satori";
import sharp from "sharp";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import config from "@/config";
export const prerender = false;

/** 同一个函数实例内缓存已验证的 TrueType 字体二进制，避免每次生成分享图都重复发起同站 HTTP 请求 */
const fontBufferCache = new Map<string, Promise<ArrayBuffer>>();

function loadFontOnce(path: string, requestUrl: string): Promise<ArrayBuffer> {
  const cached = fontBufferCache.get(path);
  if (cached) return cached;

  const loading = (async () => {
    const response = await fetch(new URL(path, requestUrl), {
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.arrayBuffer();
    if (!response.ok || data.byteLength < 4) {
      throw new Error("Invalid TrueType font response");
    }
    const signature = new DataView(data).getUint32(0);
    if (signature !== 0x00010000) {
      throw new Error("Invalid TrueType font response");
    }
    return data;
  })().catch(error => {
    // 失败的 Promise 不能留在缓存里，否则整个函数实例都会持续失败
    fontBufferCache.delete(path);
    throw error;
  });

  fontBufferCache.set(path, loading);
  return loading;
}

export const GET: APIRoute = async ({ params, request }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  let post;
  try {
    post = await getPublicPost(params.slug ?? "");
  } catch (error) {
    return publicReadError("", error);
  }
  if (!post || post.data.ogImage) return publicNotFound();
  const fonts = fontData["--font-google-sans-code"];
  const regularFontPath = getFontPathByWeight(fonts, 400);
  const boldFontPath = getFontPathByWeight(fonts, 700);

  if (regularFontPath === undefined || boldFontPath === undefined) {
    throw new Error("Cannot find the font path.");
  }

  // 动态路由运行于部署后的函数，构建机的字体缓存并不存在。
  // 字体随站点静态资源发布，此时本站字体 URL 已能访问；禁止把 HTML 错误页交给 satori。
  let regularData: ArrayBuffer;
  let boldData: ArrayBuffer;
  try {
    [regularData, boldData] = await Promise.all([
      loadFontOnce(regularFontPath, request.url),
      loadFontOnce(boldFontPath, request.url),
    ]);
  } catch (error) {
    return publicReadError("", error);
  }

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          background: "#fefbfb",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-1px",
                right: "-1px",
                border: "4px solid #000",
                background: "#ecebeb",
                opacity: "0.9",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "center",
                margin: "2.5rem",
                width: "88%",
                height: "80%",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                border: "4px solid #000",
                background: "#fefbfb",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "center",
                margin: "2rem",
                width: "88%",
                height: "80%",
              },
              children: {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    margin: "20px",
                    width: "90%",
                    height: "90%",
                  },
                  children: [
                    {
                      type: "p",
                      props: {
                        style: {
                          fontSize: 72,
                          fontWeight: "bold",
                          maxHeight: "84%",
                          overflow: "hidden",
                        },
                        children: post.data.title,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          marginBottom: "8px",
                          fontSize: 28,
                        },
                        children: [
                          {
                            type: "span",
                            props: {
                              children: [
                                "by ",
                                {
                                  type: "span",
                                  props: {
                                    style: { color: "transparent" },
                                    children: '"',
                                  },
                                },
                                {
                                  type: "span",
                                  props: {
                                    style: {
                                      overflow: "hidden",
                                      fontWeight: "bold",
                                    },
                                    children: post.data.author,
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: "span",
                            props: {
                              style: { overflow: "hidden", fontWeight: "bold" },
                              children: config.site.title,
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: [
        {
          name: "Google Sans Code",
          data: regularData,
          weight: 400,
          style: "normal",
        },
        {
          name: "Google Sans Code",
          data: boldData,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  const headers = new Headers({ "Content-Type": "image/png" });
  setPublicCache(headers);
  return new Response(new Uint8Array(pngBuffer), { headers });
};
