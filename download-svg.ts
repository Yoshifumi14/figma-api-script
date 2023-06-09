import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// * ---------------------------------------------------------------- *
// * 環境変数読み込み
// * ---------------------------------------------------------------- *

const ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FILE_ID = process.env.FIGMA_FILE_ID;
const DOWNLOAD_DIR = process.env.FIGMA_DOWNLOAD_DIR;
if (ACCESS_TOKEN == null) {
  throw new Error("Failed to read ACCESS_TOKEN");
}
if (FILE_ID == null) {
  throw new Error("Failed to read FILE_ID");
}
if (DOWNLOAD_DIR == null) {
  throw new Error("Failed to read DOWNLOAD_DIR");
}

// * ---------------------------------------------------------------- *
// * 定数
// * ---------------------------------------------------------------- *

const BASE_URL = "https://api.figma.com/v1";

const endpoint = {
  fileComponents: `${BASE_URL}/files/${FILE_ID}/components`,
  images: `${BASE_URL}/images/${FILE_ID}`,
} as const;

const requestHeaders = {
  "X-FIGMA-TOKEN": ACCESS_TOKEN,
} as const;

// * ---------------------------------------------------------------- *
// * APIのレスポンスの型 (https://www.figma.com/developers/api)
// * ---------------------------------------------------------------- *

/**
 * `GET /v1/files/:file_key/components`のレスポンス
 */
type GetComponentsResponseData = {
  error: boolean;
  meta: {
    components: Component[];
  };
};

type Component = {
  node_id: string;
  name: string;
};

/**
 * `GET /v1/images/:key`のレスポンス
 */
type GetImagesResponseData = {
  err: string | null;
  images: {
    [node_id in string]: string; // URL
  };
};

// * ---------------------------------------------------------------- *
// * main
// * ---------------------------------------------------------------- *

main();

async function main() {
  const nameList = process.argv.slice(2); // yarn download-svg argv[2] argv[3] ...
  const components = await getComponents(nameList);
  const imageUrlList = await getImages(components);
  saveImageFiles(imageUrlList);
}

async function getComponents(nameList: string[]) {
  const data = await fetchGetRequest<GetComponentsResponseData>(
    endpoint.fileComponents
  );
  const components = data.meta.components.filter((component) =>
    nameList.length !== 0 ? nameList.includes(component.name) : true
  );
  if (components.length === 0) {
    throw new Error("Failed to get components");
  }
  return components;
}

async function getImages(components: Component[]) {
  const nodeIdList = components.map((comp) => comp.node_id).join(",");
  const data = await fetchGetRequest<GetImagesResponseData>(endpoint.images, {
    ids: nodeIdList,
    format: "svg",
  });
  const imageList = Object.entries(data.images)
    .map(([nodeId, url]) => {
      return {
        name: components.find((comp) => comp.node_id === nodeId)?.name,
        url,
      };
    })
    .filter(
      (image): image is { name: string; url: string } => image.name != null
    );
  return imageList;
}

async function fetchGetRequest<T = unknown>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  return (await fetch(`${endpoint}?${new URLSearchParams(params)}`, {
    headers: requestHeaders,
    method: "GET",
  })
    .then((response) => response.json())
    .catch((error) => {
      console.error("Failed to fetch:", error);
    })) as Promise<T>;
}

const saveDir = (function () {
  const parsedPath = path.parse(DOWNLOAD_DIR);
  return path.join(parsedPath.dir, parsedPath.name);
})();

function saveImageFiles(images: { name: string; url: string }[]) {
  for (const img of images) {
    fetch(img.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.status}`);
        }
        const filePath = path.join(saveDir, `${img.name}.svg`);
        const fileWriteStream = fs.createWriteStream(filePath);
        response.body?.pipe(fileWriteStream);
        fileWriteStream.on("error", (error) => {
          console.error("Failed to save file:", error);
        });
        fileWriteStream.on("finish", () => {
          // 不要な属性を消して再度書き出し
          fs.readFile(filePath, "utf-8", (err, str) => {
            if (err) {
              console.error("Failed to read file:", err);
              return;
            }
            const newStr = str
              .replace(/fill=\"[^\"]*\"/g, 'fill=""')
              .replace(/width=\"[^\"]*\"/g, 'width=""')
              .replace(/height=\"[^\"]*\"/g, 'height=""')
              .replace(/viewBox="[^"]*"/, 'viewBox="0 0 24 24"');
            fs.writeFile(filePath, newStr, (err) => {
              if (err) {
                console.error("Failed to save file:", err);
                return;
              }
              console.log("SVG file saved successfully:", filePath);
            });
          });
        });
      })
      .catch((error) => {
        console.error("Failed to download file:", error);
      });
  }
}
