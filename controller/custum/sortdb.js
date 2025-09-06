module.exports = function (io) {
    var db = require('../adaptor/mongodb.js');
    var controller = {};

    controller.removecollection = (req, res) =>{
        var data = {};
        if(req.body.name){
            db.DeleteDocument(req.body.name, {}, (err, result) => {
                if(err){
                    res.json(err);
                }else{
                    data.response = result;
                    data.message = "Success";
                    res.json(data);
                }
                
            });
            
        }else{
            data.message = "Plese enter collection.";
            res.json(data);
        }

    }

    controller.foodproduct = (req, res) => {
        db.GetDocument('food', {}, {name:1}, {}, function (errors, fooddata) {
            if (errors) {
                res.send(errors);
            } else {
                var m=0;
                var n = 1;
               
                for(var k = 0; k < fooddata.length; k++){
                    n++;
                    db.GetDocument('food', { _id: fooddata[k]._id}, {}, {}, function (err, docdata) {
                        if (err) {
                            res.send(err);
                        } else {
                            if(docdata[0].attributes.length === 1 && docdata[0].price_details[0].unit){
                                db.GetDocument('attributes', { _id: docdata[0].attributes[0] }, {}, {}, async function (error, attributedata) {
                                    if (error) {
                                        res.send(error);
                                    } else {
                                        var data = {};
                                        var attributes = [];
                                        for(var i=0; i<docdata[0].attributes.length; i++){
                                            attributes.push(docdata[0].attributes[i]);
                                        }
                                        data.attributes = attributes;
                                        data.base_price = docdata[0].price_details[0].mprice;
                                        data.sale_price = docdata[0].price_details[0].sprice;
                                        data.max_price = docdata[0].price_details[0].sprice;
                                        data.min_price = docdata[0].price_details[docdata[0].price_details.length - 1].sprice;
                                        data.price_details = [];
                                        for(var j=0; j < docdata[0].price_details.length; j++){
                                            price_details = {attributes: [] };
                                            price_details.quantity =  docdata[0].price_details[j].quantity;
                                            price_details.mprice =  docdata[0].price_details[j].mprice;
                                            price_details.sprice =  docdata[0].price_details[j].sprice;
                                            
                                        if(docdata[0].price_details[j].image){
                                            price_details.image = docdata[0].price_details[j].image;
                                        }
                                        
                                        var unit=  attributedata[0].units.filter(function(v){ return v["name"] == docdata[0].price_details[j].unit});
                                        
                                            var attri = {
                                                attri_name:attributedata[0].name,
                                                chaild_name: unit[0].name,
                                                parrent_id: attributedata[0]._id,
                                                chaild_id: unit[0]._id
                                            };
                                            price_details.attributes.push(attri);
                                            data.price_details.push(price_details);
                                        }
                                       await db.UpdateDocument('food', { _id: docdata[0]._id }, data, {}, function (err, docdata) {
                                            if (err) {
                                            console.log("foodupdate",err)
                                            } else {
                                                m++;
                                                console.log("---m---",m);
                                            }
                                        });
                                    }
                                    if(n==fooddata.length){
                                        var product = {};
                                        product.count = fooddata.length; 
                                        product.updated = m;
                                        res.send(product);
                                    }
                                });
                                
                            }
                        }
                    });
                }
            }
        });
    }

    return controller;
}