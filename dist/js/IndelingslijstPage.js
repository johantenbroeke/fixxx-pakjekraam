document.querySelectorAll('table td.autoColor').forEach(function(td) {
    var style = window.getComputedStyle(td);
    var bgShade = getBackgroundShade(style.backgroundColor);
    td.className += bgShade === 'light' ?
                    ' background-light' :
                    ' background-dark';
});

function getBackgroundShade(rgbaColor){
    var rgb = rgbaColor.replace(/[rgba()]/gi, '')
              .split(',')
              .map(Number);
    var yiq = rgb[3] !== 0 ?
              ((rgb[0]*299)+(rgb[1]*587)+(rgb[2]*114))/1000 :
              255;
    return yiq >= 128  ? 'light' : 'dark';
}
