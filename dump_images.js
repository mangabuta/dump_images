/** @licence <https://raw.githubusercontent.com/mangabuta/dump_images/master/LICENSE> */
(function () {
  "use strict";

  if (
    window.confirm(
      `【ドラゴンクエストX アルバム画像一括保存ブックマークレットからのお知らせ】\n
思い出アルバムが公式に写真の一括保存に対応したため、このブックマークレットは提供を終了しました。\n
一方、公式の写真一括保存は写真の撮影設定など、以前ブックマークレットでCSVファイルとしてダウンロードできていたデータが含まれていないため、CSVファイルだけを別途保存できるブックマークレットを新たに公開しました。\n
OKを押すと新しいブックマークレットのページに移動します。\n
みなさんのアストルティアライフが充実しますように。`
    )
  ) {
    window.location.href = "https://github.com/mangabuta/dump_images";
  }
})();
