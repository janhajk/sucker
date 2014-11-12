        /**
         * Takes the input string and decides if
         *    - String is URL but not uploaded-link > rip site
         *    - String is ul.to Id > check ul-File
         *    - String contains ul.to links
         * 
         * It then takes the Ids to the Id-Parser which checks the links
         * 
         * @param {string} data A string that contains URLs, an Id or plain text
         */
        var parseData = function(data) {
            msg.set('start looking for links...');
            $('#content').tabs({active: 1}); // Jump to tab 1 > links

            // is link to page that may contain uploaded.net links > rip Site
            if (validateURL(data) && !isUploaded(data)) {
                msg.set('parsing site...');
                $.post('/site/links', {sites: [{link:data}]}).done(function(ids){
                    parseIDs(ids);
                }, 'json');
            }
            else if (/^[a-zA-Z0-9-]{8}/i.test(data) && data !== 'uploaded') { // is ul.to ID
                parseIDs({data: data.substr(0, 8)});
            }
            else { // is string that may contain ul.to links
                parseIDs(getLinksFromString(data));
            }
        };

        /**
         * 
         */
        var parseIDs = function(ids) {
            var links = '';
            var files = [];
            var filescount = 0;
            var curfile = 0;

            for (var key in ids) {
                if (ids.hasOwnProperty(key)) {
                    links += "\n" + "http://ul.to/" + ids[key];
                    filescount++;
                }
            }
            $('#data').val(links);
            $('#content').append('<table id="links"></table>');
            var defs = [];
            var addFile = function(info) {
                if (info !== false) {
                    files.push(info);
                }
                curfile++;
                msg.set((filescount - curfile) + ' files left to check...');
                makeTableChecked(files);
            };
            msg.set('start checking ' + filescount + ' files...');
            $.each(ids, function(key, value) {
                defs.push($.getJSON('/ul/' + value + '/check', function(info) {
                    addFile(info);
                }));
            });
            $.when.apply(null, defs).done(function() {
                msg.set(filescount + ' files checked!', 'fadeout');
                makeTableChecked(files);
            });
        };



        $('#go').click(function() {
            parseData($('#data').val());
        });