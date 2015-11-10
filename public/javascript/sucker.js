(function() {
   $(document).ready(function() {
      var movies = [];

      var getMovieById = function(_id) {
         for (var i = 0; i<movies.length;i++) {
            if (movies[i]._id === _id) {
               return i;
            }
         }
      };

      /*
            * Loads the list of Downloaded files that are on the server
            */
      var loadFiles = function() {
         $.ajax({
            url: '/files',
            type: 'get',
            cache: false,
            dataType: 'json'
         }).done(function(data){
            $('#rss_files tbody').empty();
            // Sort files by Filename
            data.sort(function(a, b) {
               a = a.filename.toLowerCase();
               b = b.filename.toLowerCase();
               return a > b ? 1 : a < b ? -1 : 0;
            });
            var tr, td = [], a, icon, del, s, i;
            for(i in data) {
               $('#rss_files tbody').append(fileRow(data[i]));
            }
         }).fail(function(){

         });
      };
      /*
            * Loads List of TV-Shows direct from monitored RSS
            *
            */
      var loadRssTV = function(type) {
         var div, rssTV = document.getElementById('rss_TV');
         $.ajax({
            url: '/tv',
            type: 'get',
            dataType: 'json',
            cache: false
         }).done(function(data) {
            for(var i in data) {
               rssTV.appendChild(siteRow(data[i]));
            }
         }).fail(function(data) {
            msg.set('Error loading TV-Shows');
         });
      };
      /**
      * Loads list of Movies as Thumbnails from db
      *
      */
      var loadRssMovies = function() {
         $.ajax({
            url: '/movies',
            type: 'get',
            dataType: 'json',
            cache: false,
         }).done(function(json) {
            var div, i;
            json.sort(function(a, b) {
               a = new Date(a.lastUpdate);
               b = new Date(b.lastUpdate);
               return a > b ? -1 : a < b ? 1 : 0;
            });
            movies = json;
            movieGrid(movies);
         }).fail(function(data) {
            msg.set('Error while loading movies');
         });
      };
      loadRssTV();
      loadRssMovies();
      loadFiles();

      /*
            * Creates a grid of all movies clickable
            *
            *
            */
      var movieGrid = function(movies) {
         var li, div, container;
         container = document.getElementById('rss_Movies');
         // empty container
         while (container.firstChild) {
            container.removeChild(container.firstChild);
         }
         // Insert new movie-thumbs into container
         for(i = 0; i < movies.length; i++) {
            div = thumbPosterWithInfoClickable(movies[i]);
            li = document.createElement('li');
            li.className = 'col-lg-1 col-md-2 col-sm-3 col-xs-4';
            li.appendChild(div);
            container.appendChild(li);
         }
      };

      /*
            * Creates a siteRow which can be parsed
            *
            * @param site  {object} {title, pubdate, link, description}
            *
            *
            */
      var siteRow = function(sites) {
         var div = document.createElement('div');
         div.className = 'hyperlinkParse';
         if(sites.title !== undefined) {
            var domain = sites.link.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            var date = new Date(sites.pubdate);
            div.innerHTML = sites.title + ' (' + date.easy() + ' @<a href="' + sites.link + '">' + domain[1] + '</a>)';
            sites = [sites];
         } else {
            div.textContent = '>- rip All Sites -<';
         }
         div.onclick = (function(sites) {
            return function() {
               msg.set('parsing site...');
               $.ajax({
                  url: '/site/links',
                  type: 'POST',
                  data: {
                     sites: sites
                  },
                  cache: false,
                  dataType: 'json'
               }).done(function(onlineLinks){processLinks(onlineLinks)}).fail(function() {
                  msg.set('Error when checking links!');
               });
            };
         })(sites);
         return div;
      };
      /*
            * Process returned online links
            */
      var processLinks = function(data) {
         /* structure of data; example
                   [
                     {
                       "status": "0",
                       "filename": "Sm.2013.720p-iFT",
                       "extension": "mkv",
                       "size": "4920000000",
                       "link": "http://ul.to/08otd5be"
                     }
                     { etc. }
                   ]
               */
         msg.set('found ' + data.length + ' links.')
         makeTableChecked(data);
         // Add links to textarea for exporting
         $('#paste').html(data.map(function(elem) {
            return elem.link;
         }).join(' '));
         $('.nav-tabs a[href="#tabLinks"]').tab('show');
      };


      /*
            * One Row of FileExplorer
            */
      var fileRow = function(file) {
         var tr = document.createElement('tr');
         var td = [];
         for(s = 0; s < 4; s++) {
            td.push(document.createElement('td'));
         }
         var a = null,
             icon = null,
             del = null,
             s = 0,
             i = 0;
         // Filename Link
         a = document.createElement('a');
         a.href = 'files/' + file.link;
         a.textContent = file.filename;
         td[0].appendChild(a);
         td[1].textContent = bytesToSize(file.size);
         // Filetype Icon
         icon = document.createElement('div');
         icon.className = 'icon icon' + file.extension;
         icon.title = file.extension;
         td[2].appendChild(icon);
         // DELETE Link
         del = document.createElement('div');
         del.className = 'a';
         del.onclick = function() {
            $.ajax({
               url: 'files/' + file.link + '/delete',
               type: 'DELETE',
               dataType: 'json'
            }).done(function(err) {
               err === null && msg.set('File Deleted', 'fadeout');
               loadFiles(); // reload files-table
            }).fail(function() {
               msg.set('Problem with connection; try again.', 'fadeout');
            });
         };
         del.textContent = 'delete';
         td[3].appendChild(del);
         for(s = 0; s < 4; s++) {
            tr.appendChild(td[s]);
         }
         return tr;
      };


      /**
            * Creates a HTML Movie-Thumb from the Movie-Poster
            *
            * @param {string} imageUrl The Url of the Movie-Poster-Image
            * @param {string} title Title of the Movie as title-tag
            *
            * @returns {Object} the DOM-Object of the div
            */
      var thumbPoster = function(imageUrl, title, year) {
         var img = document.createElement('img');
         img.src = imageUrl;
         img.className = 'thumbPosterImg thumb thumbnail';
         img.style.height = '150px';
         img.title = title + ' (' + year + ')';
         var divTitle = document.createElement('div');
         var div = document.createElement('div');
         div.className = 'thumbPoster';
         divTitle.title = title + ' (' + year + ')';
         divTitle.className = 'thumbPosterTitle';
         divTitle.textContent = title;
         if(imageUrl === 'http://image.tmdb.org/t/p/w500null' || imageUrl === '' || (/poster_default/).test(imageUrl)) {
            img.src = '/images/default.jpg';
            //div.appendChild(divTitle);

         }
         div.appendChild(img);
         return div;
      };
      /**
            * Adds info to the movie-Thumb (Resolution, etc.)
            */
      var thumbPosterWithInfo = function(imageUrl, title, year, resolutions) {
         var thumb = thumbPoster(imageUrl, title, year);
         var divRes = document.createElement('div');
         divRes.className = 'resolutionBar';
         divRes.textContent = resolutions.join(', ');
         //thumb.appendChild(divRes);
         return thumb;
      };
      var thumbPosterWithInfoClickable = function(mData) {
         imgUrl = mData.info.posters !== undefined ? mData.info.posters.thumbnail : '';
         var uberDiv = document.createElement('div');
         var div = thumbPosterWithInfo(imgUrl, mData.title, mData.info.year, mData.resolutions);
         var trash = buttonTrash(mData._id);
         trash.style.marginTop = '-160px';
         trash.style.marginLeft = '10px';
         div.style.cursor = 'pointer';
         div.onclick = (function(_id, title, info, image, sites, div) {
            return function() {
               $('.nav-tabs a[href="#tabLinks"]').tab('show');
               $('#linksDetails').empty();
               $('#linksDetails').append(divMovieInfo(_id, title, image, info.runtime ? info.runtime : '?', info.year, 'imdb-Rating', info.synopsis === '' ? 'no synopsis' : info.synopsis, 'actors', div));
               // Site-Links for ripping links
               var linkList = document.getElementById('linksDetails');
               // Link to Rip all links at the same time
               linkList.appendChild(siteRow(sites));
               // Single Links that can be parsed
               for(var key in sites) {
                  linkList.appendChild(siteRow(sites[key]));
               }
            };
         })(mData._id, mData.title, mData.info, imgUrl, mData.sites, div);
         div.style.position = 'relative';
         div.style.left = '0';
         div.style.top = '0';
         uberDiv.style.height = '100px';
         uberDiv.appendChild(div);
         uberDiv.appendChild(trash);
         return uberDiv;
      };
      /*
           * Little trash icon to place on poster
           */
      var buttonTrash = function(id) {
         var div = document.createElement('div');
         var a   = document.createElement('a');
         var span = document.createElement('span');
         span.className = 'glyphicon glyphicon-trash';
         a.title = 'don\'t display this movie anymore.';
         a.href = 'javascript:';
         a.onclick = function() {
            $.getJSON('/movie/' + id + '/hide', function(data) {
               var i = getMovieById(id);
               movies.splice(i,1);
               movieGrid(movies);
               msg.set('Movie will not be shown anymore!', 'fadeout');
               $('.nav-tabs a[href="#tabHome"]').tab('show');
            });
         };
         a.appendChild(span);
         div.appendChild(a);
         div.style.left = '0px';
         div.style.top = '0px';
         div.style.position = 'relative';
         return div;
      };
      /**
            * Creates the Movie-Info-Card
            */
      var divMovieInfo = function(_id, title, posterUrl, runtime, year, imdb, synopsis, actors, thumbDiv) {
         var div = document.createElement('div');
         div.className = 'movieDigest';
         var divOuter = document.createElement('div');
         divOuter.className = 'movieInfo';
         var divTitle = document.createElement('h2');
         divTitle.className = 'movieInfoTitle';
         divTitle.textContent = title;
         var divDetails = document.createElement('div');
         divDetails.className = 'movieInfoLine';
         divDetails.textContent = 'Length: ' + runtime + 'min, Year: ' + year + ', ';
         var spanRemove = createElementSpanRemove(_id, thumbDiv);
         divDetails.appendChild(spanRemove);
         divDetails.appendChild(createElementSpanSpace());
         var spanUpdate = createElementSpanUpdate(_id);
         divDetails.appendChild(spanUpdate);
         var divSynopsis = document.createElement('div');
         divSynopsis.className = 'movieInfoLine';
         divSynopsis.textContent = synopsis;
         divSynopsis.style.fontStyle = 'italic';
         var poster = thumbPoster(posterUrl, title, year);
         poster.style.float = 'left';
         divOuter.appendChild(divTitle);
         divOuter.appendChild(divDetails);
         divOuter.appendChild(divSynopsis);
         div.appendChild(poster);
         div.appendChild(divOuter);
         return div;
      };
      /**
            * creates a space-span of len white spaces
            */
      var createElementSpanSpace = function(len) {
         if(len === undefined) len = 1;
         var span = document.createElement('span');
         var space = '';
         for(var i = 0; i < len; i++) {
            space += ' ';
         }
         span.textContent = space;
         return span;
      };
      /**
            * Creates a trash-button which removes a movie from future display
            */
      var createElementSpanRemove = function(id, thumbDiv) {
         var button = document.createElement('div');
         button.className = 'btn btn-default btn-sm';
         var span = document.createElement('span');
         span.textContent = ' remove';
         span.title = 'don\'t display this movie anymore.';
         span.className = 'glyphicon glyphicon-trash';
         button.onclick = function() {
            $.getJSON('/movie/' + id + '/hide', function(data) {
               var i = getMovieById(id);
               movies.splice(i,1);
               movieGrid(movies);
               msg.set('Movie will not be shown anymore!', 'fadeout');
               $('.nav-tabs a[href="#tabHome"]').tab('show');
               thumbDiv.parentNode.removeChild(thumbDiv);
            });
         };
         button.appendChild(span)
         return button;
      };

      /*
            * Creates a link which updates a movie-info
            */
      var createElementSpanUpdate = function(id) {
         var button = document.createElement('div');
         button.className = 'btn btn-default btn-sm';
         var span = document.createElement('span');
         span.textContent = ' update';
         span.title = 'update info to this movie';
         span.className = 'glyphicon glyphicon-refresh';
         button.onclick = function() {
            $.getJSON('/movie/' + id + '/update', function(data) {
               msg.set('Movie-Info Updated', 'fadeout');
            });
         };
         button.appendChild(span)
         return button;
      };

      /*
            * Create a Link that can be parsed (for one or multiple Links)
            */
      var parseLink = function(text, sites, clickEvent) {
         var div = document.createElement('div');
         div.className = 'hyperlinkParse';
         div.textContent = text;
         div.onclick = function() {
            clickEvent(sites);
         };
         return div;
      };

      /*
            * Table with ul.to links that have been checked for availability
            *
            * @param {array} files an Array containing all checked ul.to links
            */
      var makeTableChecked = function(files) {
         // one tab for every extension; integer is filecount per extension
         var extensions = {
            mp4: 0,
            mkv: 0,
            avi: 0,
            rar: 0,
            default: 0
         };
         var rowcols = ['link', 'size', 'extension', 'jd', 'cloud'];
         var target = '#tabs-links-';
         // empty all tabs
         for(var i in extensions) $(target + i + ' tbody').empty();
         var cols = function() {
            var tds = [];
            for(var i in rowcols) tds.push(document.createElement('td'));
            return tds;
         };
         // sort files by extension
         files.sort(function(a, b) {
            return a.extension < b.extension ? 1 : a.extension > b.extension ? -1 : 0;
         });
         var makeRow = function(filename, href, extension, size) {
            // create new DOM-table-row
            var tr = document.createElement('tr');
            // create cells
            var tds = [];
            for(var i in rowcols) tds.push(document.createElement('td'));
            // Link/Name Col
            var link = document.createElement('a');
            link.href = href;
            link.textContent = filename;
            tds[0].appendChild(link);
            // Size Col
            tds[1].textContent = bytesToSize(size);
            // Extension Col
            var extension = document.createElement('div');
            extension.className = 'icon icon' + extension;
            extension.title = extension;
            tds[2].appendChild(extension);
            // J-Downloader Col
            tds[3].appendChild(jDLink(link));
            // Download to Server Col
            var cloud = document.createElement('div');
            cloud.className = 'icon iconcloud';
            cloud.title = 'download to diskstation';
            cloud.onclick = (function(link) {
               return function() {
                  DownloadStation(link);
               };
            })(href);
            tds[4].appendChild(cloud);
            for(var key in tds) tr.appendChild(tds[key]);
            return tr;
         };
         // Loop through all files
         for(i in files) {
            var t = (extensions[files[i].extension] !== undefined) ? files[i].extension : 'default';
            extensions[t]++;
            var tr = makeRow(files[i].filename, files[i].link, files[i].extension, files[i].size);
            $(target + t + ' tbody').append(tr);
         }
         // update files per extension
         if(extensions.mp4 === 0) {
            $('.nav-tabs a[href="#tabLinks"]').tab('show');
         } else {
            $('.nav-tabs a[href="#tabs-links-mkv"]').tab('show');
         }
         // Update Tab-title counter
         for(var i in extensions) {
            $('#rssLinks ul:first li:eq(' + (Object.keys(extensions)).indexOf(i) + ') a').text(i + '(' + extensions[i] + ')');
         }
      };

      // Manual parser Button
      (function(){
         var bParse = document.getElementById('go');
         bParse.onclick = function(){
            var data = document.getElementById('data').value;
            if (validateURL(data)) {
               msg.set('parsing site...');
               $.ajax({
                  url: '/site/links',
                  type: 'POST',
                  data: {
                     sites: [{link:data}]
                  },
                  cache: false,
                  dataType: 'json'
               }).done(function(onlineLinks){processLinks(onlineLinks)}).fail(function() {
                  msg.set('Error when checking links!');
               });
            }
         };
      })();




   });
})();