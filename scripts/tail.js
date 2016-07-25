// Add a tail to every post from tail.md
// Great for adding copyright info

var fs = require('fs');

hexo.extend.filter.register('before_post_render', function(data){
    if(data.copyright == false) return data;
    var file_content = fs.readFileSync('tail.md');
    if(file_content && data.content.length > 50) 
    {
        var permalink = '<!-- more--><center><hr style="height:1px;border:none;border-top:1px dashed #0066CC;" />本文永久链接：' + data.permalink + '</center>';
        data.content += permalink;
        data.content += file_content;
    }
    return data;
});