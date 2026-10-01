/**
 * 读取字体文件（给 satori 生成 OG 图用）
 * ============================================================
 * 自包含模块：只依赖 node:fs 和 astro:assets 的类型。
 *
 * 【为什么不能像原来那样用 fetch 去取字体】
 *   Astro 给的取字体写法是：
 *
 *       fetch(experimental_getFontFileURL(path, url))
 *
 *   它在**开发服务器**下能work：那个地址由开发服务器实时提供。
 *   但这两个 OG 图路由是**预渲染**的（构建时生成静态 PNG），
 *   预渲染期间并没有站点在服务自己 —— 那个地址取回来的是
 *   一张 HTML 错误页。
 *
 *   实测（本机构建、代理已开、字体已下载到缓存）：
 *
 *       GET http://localhost:4321/_astro/fonts/3eddf4b9....ttf
 *       → HTTP 404，content-type: text/html，16561 字节，开头是 "<!DO"
 *
 *   把这张 HTML 当字体喂给 satori，报的是：
 *
 *       RangeError: Offset is outside the bounds of the DataView
 *         at Object.parseBuffer (opentype.js)
 *
 *   报错完全看不出"拿回来的是 HTML"，所以这个坑很难定位。
 *
 * 【为什么读 node_modules/.astro/fonts/ 是可行的】
 *   那是 Astro 下载字体的缓存目录，构建时字体已经被复制到
 *   dist/_astro/fonts/ 了。关键是**两边文件名相同**：
 *   fontData 里 src.url 形如 "/_astro/fonts/3eddf4b9....ttf"，
 *   它的 basename 就是缓存里的文件名。所以用 basename 就能对上。
 *
 *   ⚠️ 这毕竟依赖了 Astro 的内部目录名（.astro/fonts），
 *      将来 Astro 大版本升级时这里可能失效 —— 那时的表现是
 *      构建报"找不到字体文件"，错误信息里会写明路径，能一眼定位。
 *      更彻底的做法是换掉 google provider、把 ttf 提交进仓库，
 *      再用自定义 provider 指过去（见 astro.config.ts 的 fonts 段）。
 * ============================================================
 */
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

/** Astro 缓存字体的目录，相对项目根目录 */
const FONT_CACHE_DIR = "node_modules/.astro/fonts";

/**
 * 读取一个字重对应的字体文件。
 *
 * @param path fontData 里的字体地址，例如 "/_astro/fonts/3eddf4b9....ttf"
 *             （线上可能带查询串，见下面）
 * @returns 可以直接交给 satori 的 ArrayBuffer
 */
export async function readFontFile(path: string): Promise<ArrayBuffer> {
  /**
   * ⚠️ 必须**先去掉查询串**再取文件名。
   *
   * Astro 给的地址在线上会长这样：
   *   /_astro/fonts/ccba4fb3766b1b6e.ttf?dpl=6abde91986103b000947ddaf
   * 那个 `?dpl=` 是 Netlify 自己加的资源版本号（跟着部署 id 走）。
   *
   * 而 basename() **不认查询串** —— 它会把
   * "ccba4fb3766b1b6e.ttf?dpl=..." 整个当成文件名，于是报：
   *
   *   ENOENT: no such file or directory, open
   *     'node_modules/.astro/fonts/ccba4fb3766b1b6e.ttf?dpl=...'
   *
   * 这个坑的特点：**本地构建没有那个参数，怎么试都是好的**，
   * 只有线上部署会挂 —— 所以别在本地找原因。
   */
  const [pathname] = path.split("?");
  const file = basename(pathname ?? path);

  const fullPath = join(FONT_CACHE_DIR, file);

  const buffer = await readFile(fullPath);

  /**
   * 必须切出**精确的那一段**再转 ArrayBuffer。
   *
   * Node 读文件返回的 Buffer 是一个共享内存池上的视图，
   * buffer.buffer 可能比这个文件大得多。直接交出去，
   * satori（opentype.js）会从错误的偏移开始解析而报错 ——
   * 这正是"Offset is outside the bounds of the DataView"的另一种成因。
   */
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}
