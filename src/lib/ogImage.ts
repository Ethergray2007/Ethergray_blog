/**
 * 共享 OG 社交分享图渲染器（Satori + Sharp）
 * ============================================================
 * 把站点默认图（src/pages/og.png.ts）与文章动态图
 * （src/pages/posts/[...slug]/index.png.ts）共用的一套 1200×630 卡片
 * 布局收敛到这里，避免两处各维护 130+ 行重复 Satori 节点树。
 *
 * 想删除：连同两个 OG 路由一起删掉，并在 astro-paper.config.ts 关闭 dynamicOgImage。
 * ============================================================
 */
import satori from "satori";
import sharp from "sharp";

export type OgFontBuffers = {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
};

type OgCardOptions = {
  title: string;
  subtitle?: string;
  author?: string;
  siteLabel: string;
  centered?: boolean;
  fonts: OgFontBuffers;
};

/** 渲染 1200×630 PNG 二进制，直接用于 Response body */
export async function renderOgPng({
  title,
  subtitle,
  author,
  siteLabel,
  centered = false,
  fonts,
}: OgCardOptions): Promise<Uint8Array> {
  const mainBody = centered
    ? {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "90%",
            maxHeight: "90%",
            overflow: "hidden",
            textAlign: "center",
          },
          children: [
            {
              type: "p",
              props: {
                style: { fontSize: 72, fontWeight: "bold" },
                children: title,
              },
            },
            ...(subtitle
              ? [
                  {
                    type: "p",
                    props: {
                      style: { fontSize: 28 },
                      children: subtitle,
                    },
                  },
                ]
              : []),
          ],
        },
      }
    : {
        type: "p",
        props: {
          style: {
            fontSize: 72,
            fontWeight: "bold",
            maxHeight: "84%",
            overflow: "hidden",
          },
          children: title,
        },
      };

  const footerChildren = author
    ? [
        {
          type: "span",
          props: {
            children: [
              "by ",
              {
                type: "span",
                props: {
                  style: { overflow: "hidden", fontWeight: "bold" },
                  children: author,
                },
              },
            ],
          },
        },
        {
          type: "span",
          props: {
            style: { overflow: "hidden", fontWeight: "bold" },
            children: siteLabel,
          },
        },
      ]
    : {
        type: "span",
        props: {
          style: { overflow: "hidden", fontWeight: "bold" },
          children: siteLabel,
        },
      };

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
          fontFamily: "Google Sans Code",
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
                    mainBody,
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: author ? "space-between" : "flex-end",
                          width: "100%",
                          marginBottom: "8px",
                          fontSize: 28,
                        },
                        children: footerChildren,
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
          data: fonts.regular,
          weight: 400,
          style: "normal",
        },
        {
          name: "Google Sans Code",
          data: fonts.bold,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Uint8Array(pngBuffer);
}
