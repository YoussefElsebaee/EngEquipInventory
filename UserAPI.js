const db = require('../../connectors/db');

const { Authenticate, AuthorizedStandardUser, GetUser } = require('../../middleware/auth'); 

function getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}


function handleStandardUserBackendApi(app) {

    app.post('/api/v1/rating/new', Authenticate, AuthorizedStandardUser, GetUser, async(req,res) => {

        UserId= GetUser();

        try{
            const {equipmentID, comment, score}= req.body;
        
            const result = await db.raw(`INSERT INTO "rating" (UserId, equipmentId, comment, score) 
            VALUES ('${UserId}' ,'${equipmentID}', '${comment}', '${score}');`);

        return res.status(201).json({ message: "Successfully added", rating: result.rows[0] });
        }
        
        catch(err){
            console.error("Error adding rating:", err.message);
        return res.status(500).send("Failed to add rating");
        }

    }
    )


    app.post('/api/v1/cart/new', Authenticate, AuthorizedStandardUser, GetUser, async(req,res) => {

        UserId= GetUser();

        try{
                const { equipmentID, quantity}=req.body;

                const result = await db.raw(`INSERT INTO "rating" (UserId, equipmentId, quantity) 
            VALUES ('${UserId}' ,'${equipmentID}', '${quantity}');`);

            return res.status(201).json({ message: "successfully added", cart: result.row[0] });
        }
        catch(err){
            
                console.log("failed adding item in cart", err.message);
            return res.status(500).send("Failed to add item in cart");
        }

    }
    )

    app.delete('/api/v1/cart/delete/:cartId', Authenticate, AuthorizedStandardUser, GetUser, async(req,res) => {

        UserId= GetUser();

        try{
                const query= 'DELETE FROM "cart" WHERE cart_ID= ${req.params.cartId} and user_ID= ${UserId}';
                const result= db.raw(query);

                return res.status(201).json({ message: "successfully deleted"});
        }
        catch(err){
                console.log("couldn't delete item", err.message);
            return res.status(500).send("Failed to delete item");     
        }

    }
    )

    app.post('/api/v1/order/new', Authenticate, AuthorizedStandardUser, GetUser, async(req,res) => {

        UserId= GetUser();
    try{
            const cartquery= 'select FROM "cart" WHERE user_ID= ${UserId}';
            const cartItems = await db.raw(cartquery);
        if(cartItems.rows.length==0){
            return res.status(400).send("Cart is empty. Cannot create an order.");
        }

        for(let item of cartItems){

            const resultEO = await db.raw(`INSERT INTO "EquipmentOrder" (equipmentID, quantity) 
            VALUES ('${item.equipment_ID}' ,'${item.quantity}');`);

        }
        const timenow= getCurrentTime();
        const resultO = await db.raw(`INSERT INTO "orders" (userid ,date) 
                VALUES ('${UserId}' ,'${timenow}');`);

            return res.status(201).json({ message: "3mlna el order"});
    }
    catch(err){
            console.log("couldn't make an order", err.message);
        return res.status(500).send("Failed to make an order");     
    }

    }
    )
    }
    
module.exports = {handleStandardUserBackendApi};
