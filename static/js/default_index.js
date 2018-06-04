// This is the js for the default/index.html view.


var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    /* HELPER FUNCTIONS */
    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    // Enumerates an array.
    var enumerate = function(v) {
        var k=0; 
        return v.map(function(e) {e._idx = k++;});
    };

    /* UPLOAD FUNCTIONS */
    self.open_uploader = function () {
        $("div#uploader_div").show();
        self.vue.is_uploading = true;
    };

    self.close_uploader = function () {
        $("div#uploader_div").hide();
        self.vue.is_uploading = false;
        $("input#file_input").val(""); // This clears the file choice once uploaded.

    };

    self.upload_file = function (event) {
        // Reads the file.
        self.vue.add_image_pending = true;
        var input = event.target;
        var file = document.getElementById("file_input").files[0];
        // We want to read the image file, and transform it into a data URL.
        var reader = new FileReader();

        // We add a listener for the load event of the file reader.
        // The listener is called when loading terminates.
        // Once loading (the reader.readAsDataURL) terminates, we have
        // the data URL available. 
        reader.addEventListener("load", function () {
            // An image can be represented as a data URL.
            // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
            // Here, we set the data URL of the image contained in the file to an image in the
            // HTML, causing the display of the file image.
            self.vue.img_url = reader.result;
        }, false);

        if (file) {
            // Reads the file as a data URL.
            reader.readAsDataURL(file);
            // Gets an upload URL.
            console.log("Trying to get the upload url");
            $.getJSON('https://upload-dot-luca-teaching.appspot.com/start/uploader/get_upload_url',
                function (data) {
                    // We now have upload (and download) URLs.
                    var put_url = data['signed_url'];
                    var get_url = data['access_url'];
                    console.log("Received upload url: " + put_url);
                    // Uploads the file, using the low-level interface.
                    var req = new XMLHttpRequest();
                    req.addEventListener("load", self.upload_complete(get_url));
                    // TODO: if you like, add a listener for "error" to detect failure.
                    req.open("PUT", put_url, true);
                    req.send(file);
                });
        }
    };


    self.upload_complete = function(get_url) {
        // Hides the uploader div.
        self.close_uploader();
        console.log('The file was uploaded; it is now available at ' + get_url);
        // TODO: The file is uploaded.  Now you have to insert the get_url into the database, etc.
        self.add_image(get_url);
    };



    self.add_image = function(get_url){
        $.post(add_image_url,
            {
            image_url: get_url,
            price: self.vue.upload_price,
            },
            function(data){
                console.log(get_url)
                self.vue.get_user_images(self.vue.auth_id);
            }
        )
        // console.log(get_url);
        
    };
    
    /* USER INFO FUNCTIONS */
    self.get_users = function(){
        //This function only ever called on page load
        $.getJSON(get_users_url,
            function(data) {
                self.vue.userlist = data.userlist;
                self.vue.auth_id = data.auth_id;
                enumerate(self.vue.userlist);
                self.get_user_images(self.vue.auth_id);
            }
        );
    };
    
    self.get_user_images = function(user_id){
        self.vue.current_gallery = user_id;
        self.vue.add_image_pending = true;
        self.vue.self_page = false;
        if (self.vue.auth_id == user_id){
            self.vue.self_page = true;
        }
        self.vue.last_selection = user_id;
        $.post(user_images_url,
            {
            user_id: user_id,
            start_idx: 0,
            end_idx: self.vue.get_more_multiple
            },
            function(data){
                console.log('got user images');
                self.vue.imagelist = data.imagelist;
                self.vue.has_more = data.has_more;
                enumerate(self.vue.imagelist);
                self.vue.add_image_pending = false;
                $("#vue-div").show();
            }
        );
    };
    
    self.get_more = function(){
        user_id = self.vue.last_selection;
        self.vue.add_image_pending = true;
        var num_images = self.vue.imagelist.length;
        console.log(num_images)
        var end_idx = num_images + self.vue.get_more_multiple;
        console.log(end_idx)
        $.post(user_images_url,
        {
            user_id: user_id,
            start_idx: num_images,
            end_idx: end_idx,
        },
        function(data){
            self.extend(self.vue.imagelist, data.imagelist);
            self.vue.has_more = data.has_more;
            enumerate(self.vue.imagelist);
            self.vue.add_image_pending = false;
        }
        );
    }
    
    self.show_selection = function(user_id){
        if(user_id == self.vue.last_selection){
            return String.fromCharCode(0x25C0);
        }
        return ""
    }
    
    /* PRICE FUNCTIONS */
    self.print_price = function(price, mode=0){
        var val = price.toString();
        if(val == 0 && mode != 1) return "Free!";
        
        var dot_idx = val.indexOf(".");
        if(dot_idx != -1){
            var diff = val.length - 1 - dot_idx;
            if((val.charAt(dot_idx + 1) != "") && (diff == 1)){
                val = val + "0";
            }
        }else{
            val = val + ".00"
        }
        
        return "$" + val;
    }
    
    self.set_price = function(image_idx) {
        $.post(set_price_url,
            {
            image_id: self.vue.imagelist[image_idx].id,
            price: self.vue.imagelist[image_idx].price,
            },
            function(data){
            }
        )
    }
    
    /* CART FUNCTIONS */
    self.store_cart = function() {
        localStorage.cart = JSON.stringify(self.vue.cart);
    };

    self.read_cart = function() {
        if (localStorage.cart) {
            self.vue.cart = JSON.parse(localStorage.cart);
        } else {
            self.vue.cart = [];
        }
        self.update_cart();
    };

    self.update_cart = function () {
        enumerate(self.vue.cart);
        var cart_size = 0;
        var cart_total = 0;
        for (var i = 0; i < self.vue.cart.length; i++) {
            cart_size++;
            cart_total += self.vue.cart[i].price;
        }
        self.vue.cart_size = cart_size;
        self.vue.cart_total = cart_total;
    };
    
    self.add_to_cart = function(image_idx){
        console.log('add idx '+image_idx+' to cart?');
        var prod = self.vue.imagelist[image_idx];
         // I need to put the product in the cart.
        // Check if it is already there.
        var already_present = false;
        var found_idx = 0;
        for (var i = 0; i < self.vue.cart.length; i++) {
            if (self.vue.cart[i].id === prod.id) {
                already_present = true;
                found_idx = i;
            }
        }
        // If it's not there, insert it.
        if (!already_present) {
            console.log('added idx '+image_idx+' to cart');
            found_idx = self.vue.cart.length;
            self.vue.cart.push(prod);
        }

        // Updates the amount of products in the cart.
        self.update_cart();
        self.store_cart();
        self.vue.get_user_images(self.vue.current_gallery);
        console.log('printing cart')
        console.log(self.vue.cart);
        console.log('added to cart')
    }
    

    self.is_in_cart = function(image_idx){
        var prod = self.vue.imagelist[image_idx];
        // Check if it is already there.
        var in_cart = false;
        for (var i = 0; i < self.vue.cart.length; i++) {
            if (self.vue.cart[i].id === prod.id) {
                in_cart = true;
            }
        }
        return in_cart;
    }
    
    self.get_cart_total = function(){
        var t = 0.0;
        for (var i = 0; i < self.vue.cart.length; i++) {
            t += self.vue.cart[i].price;
        }
        return t;
    }
    
    self.remove_from_cart = function(image_id){
        console.log('remove item id:'+image_id +' from cart?');
         // I need to put the product in the cart.
        // Check if it is already there.
        var present = false;
        var found_idx = 0;
        for (var i = 0; i < self.vue.cart.length; i++) {
            if (self.vue.cart[i].id === image_id) {
                present = true;
                found_idx = i;
            }
        }
        // If it's there, remove it.
        if (present) {
            console.log('removed item id '+image_id+' from cart');
            self.vue.cart.splice(found_idx, 1);
        }

        
        // Updates the amount of products in the cart.
        self.update_cart();
        self.store_cart();
        self.vue.get_user_images(self.vue.current_gallery);
        console.log('printing cart')
        console.log(self.vue.cart);
        console.log('removed from cart');
    }
    
    
    
    /* =========== VUE ============ */
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            is_uploading: false,
            img_url: null,
            userlist: [],
            imagelist: [],
            cart: [],
            has_more: false,
            last_selection: null,
            add_image_pending: true,
            self_page: true,
            auth_id: -1,
            get_more_multiple: 20,
            is_checkout: false,
            cart_size: 0,
            cart_total: 0,
            upload_price: 0,
            current_gallery: null,
        },
        methods: {
            open_uploader: self.open_uploader,
            close_uploader: self.close_uploader,
            upload_file: self.upload_file,
            add_image: self.add_image,
            get_users: self.get_users,
            get_user_images: self.get_user_images,
            get_more: self.get_more,
            print_price: self.print_price,
            add_to_cart: self.add_to_cart,
            store_cart: self.store_cart,
            update_cart: self.update_cart,
            set_price: self.set_price,
            is_in_cart: self.is_in_cart,
            show_selection: self.show_selection,
            get_cart_total: self.get_cart_total,
            remove_from_cart: self.remove_from_cart,
        }

    });

    /* INIT SCRIPT */
    self.get_users();
    
    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});

