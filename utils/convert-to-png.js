// This is horrible in so many ways but I didn't want to spend any longer
// than the minimum necessary getting to know Illustrator scripting.
//
// For future ref the Illustrator OM is here:
//
//   https://www.adobe.com/content/dam/acom/en/devnet/illustrator/pdf/Illustrator_Scriptin_Reference_JavaScript_cc.pdf
//
// But I can't seem to find any current reference for the file utilities.
// This is the best I could find:
//
//   https://wwwimages2.adobe.com/content/dam/acom/en/devnet/scripting/pdfs/javascript_tools_guide.pdf
//
// Also, it looks like Illustrator only supports ES3?

var sourceFiles = File.openDialog(
  'Select the file(s) to convert',
  '*.svg',
  true
);

var sizes = [16, 32, 48];

if (sourceFiles != null) {
  if (sourceFiles.length > 0) {
    var destFolder = Folder.selectDialog(
      'Select the folder to save the converted PNG files',
      '~'
    );

    for (var i = 0; i < sourceFiles.length; i++) {
      var sourceDoc = app.open(sourceFiles[i]);

      for (var j = 0; j < sizes.length; j++) {
        var destSize = sizes[j];
        var targetFile = getNewName(sourceDoc, destFolder, destSize);
        var pngExportOpts = getPNGOptions(destSize);

        sourceDoc.exportFile(targetFile, ExportType.PNG24, pngExportOpts);
      }

      sourceDoc.close(SaveOptions.DONOTSAVECHANGES);
    }

    alert('Done');
  } else {
    alert('No matching files found');
  }
}

function getNewName(sourceDoc, destFolder, destSize) {
  var newName =
    sourceDoc.name.substr(0, sourceDoc.name.lastIndexOf('.')) +
    '-' +
    destSize +
    '.png';

  return new File(destFolder + '/' + newName);
}

function getPNGOptions(destSize) {
  var pngExportOpts = new ExportOptionsPNG24();

  pngExportOpts.antiAliasing = true;
  pngExportOpts.artBoardClipping = true;
  pngExportOpts.horizontalScale = destSize / 200 * 100;
  pngExportOpts.verticalScale = destSize / 200 * 100;
  pngExportOpts.matte = false;
  pngExportOpts.transparency = true;

  return pngExportOpts;
}
