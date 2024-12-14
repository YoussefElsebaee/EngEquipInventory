const db = require('../../connectors/db');


const {authMiddleware} = require('../../middleware/auth'); 
const {getUserId, getUser} = require('../../utils/session'); 

async function checkUser(req, res){

  const User= await getUser(req);
  console.log("tmam", User.role);

    if(User.role != 'standard_user'){
      return res.status(400).send('Access denied. ONLY users have permission to perform this action.');
    }
} 


function handleStandardUserBackendApi(app) {

    app.get('/api/v1/equipment/view' ,async(req,res) => {
        
        await checkUser(req);
        
        try{
          /*const result = await db.raw(`SELECT equipment.*, categories.category_name, suppliers.supplier_name FROM equipment 
            JOIN categories ON equipment.category_id = categories.category_id 
            JOIN suppliers ON equipment.supplier_id = suppliers.supplier_id;`*/

            const result= await db.raw('select * from public.equipments');
      
          console.log(`Results`,result.rows);
          return res.status(200).send(result.rows);
        }catch(err){
          console.log("Error",err.message);
          return res.status(400).send(err.message);
        }
      }
    )
    
    app.post('/api/v1/rating/new', async (req, res) => {
      await checkUser(req);
    
      const { equipment_id, comment, score } = req.body;  // Changed 'equipmentID' to 'equipment_id'
      const UserId = await getUserId(req);
    
      if (!equipment_id || !score) {
        return res.status(400).send("Equipment ID and score are required.");
      }
    
      try {
        // Check if equipment exists
        const equipmentExists = await db('public.equipments')
          .where('equipment_id', equipment_id)
          .first(); // Retrieves the first match
    
        if (!equipmentExists) {
          return res.status(404).send("Equipment not found.");
        }
    
        const query = 
      `INSERT INTO "public"."rating" (user_id, equipment_id, comment, score)
      VALUES ('${UserId}', '${equipment_id}', '${comment}', ${score});`;

      const result = await db.raw(query);
    
        return res.status(200).send(result.rows);
      } catch (err) {
        console.error("Error adding rating:", err.message);
        return res.status(500).send("Failed to add rating");
      }
    }
    )

    app.post('/api/v1/cart/new', async(req,res) => {
      await checkUser(req);

      const { equipment_id, quantity}=req.body;

      if(!equipment_id || !quantity){
        return res.status(400).send("Equipment ID and quantity are required.");
      }

      if (quantity <= 0) {
        return res.status(400).send("Quantity must be greater than zero.");
      }

      const UserId= await getUserId(req);

        try{
                const equipment = await db('public.equipments')
                .where('equipment_id', equipment_id)
                .first();

                if (!equipment) {
                return res.status(404).send("Equipment not found.");
                }

                if (quantity > equipment.quantity) {
                return res.status(400).send("Requested quantity exceeds available stock.");
                }

                const result = await db.raw(`INSERT INTO "cart" (User_id, equipment_id, quantity) 
                VALUES ('${UserId}' ,'${equipment_id}', '${quantity}');`);

            return res.status(201).send("Equipment successfully added to the cart.");
        }
        catch(err){
            
                console.log("failed adding item in cart", err.message);
            return res.status(500).send("Failed to add item in cart");
        }
    }
    )

    app.delete('/api/v1/cart/delete/:cartId', async(req,res) => {

      await checkUser(req);
      const UserId = await getUserId(req);
      const cartId = req.params.cartId;

      try{
        const cart = await db('public.cart')
        .where('user_id' , UserId)
      .andWhere('cart_id', cartId)  // Check if the user owns the cart item
      .first();  // Get the first result, assuming cart_ID is unique per user

      console.log(cart);

    if (!cart) {
      return res.status(404).send("Cart not found or you do not have permission to delete this item.");
    }

        const result = await db('public.cart')
        .where('user_id' , UserId)
      .andWhere('cart_id', cartId)  // Check if the user owns the cart item
      .del();  // Use `del()` to delete the record

    
    if (result === 0) {
      return res.status(404).send("Cart item not found.");
    }

    return res.status(200).json({ message: "Successfully deleted the cart item." });
        }
        catch(err){
                console.log("couldn't delete item", err.message);
            return res.status(500).send("Failed to delete item");     
        }

    }
    )


    app.post('/api/v1/order/new', async (req, res) => {
      // Step 1: Authenticate the user
      await checkUser(req); // Ensure only logged-in users can access this route
    
      const UserId = await getUserId(req); // Get the user's ID from the session
    
      try {
        // Start a transaction
        const trx = await db.transaction();
    
        try {
          // Step 2: Retrieve the user's cart
    
            const cartItems = await trx('public.cart')
            .where('user_id', UserId)
            .select('equipment_id', 'quantity'); // Ensure exact casing for column names

          // Check if the cart is empty
          if (!cartItems || cartItems.length === 0) {
            await trx.rollback();
            return res.status(400).send("Your cart is empty. Add items to your cart before placing an order.");
          }
    
          // Step 3: Create a new order
          const [orderIdObj] = await trx('public.orders')
          .insert({ user_id: UserId })
          .returning('order_id');

          const orderId = orderIdObj.order_id; // Extract the integer value

          const equipmentOrderData = cartItems.map(item => ({
            order_id: orderId, // Correct integer value
            equipment_id: item.equipment_id,
            quantity: item.quantity
          }));

        await trx('public.equipment_order').insert(equipmentOrderData); // Bulk insert

    
          // Step 5: Reduce equipment quantities in the `equipments` table
          for (const item of cartItems) {
            const equipment = await trx('public.equipments')
              .where('equipment_id', item.equipment_id)
              .select('quantity') // Get current stock
              .first();
    
            if (!equipment || equipment.quantity < item.quantity) {
              await trx.rollback();
              return res.status(400).send(`Not enough stock for equipment ID ${item.equipment_ID}.`);
            }
    
            // Reduce the stock by the ordered quantity
            await trx('public.equipments')
              .where('equipment_id', item.equipment_id)
              .update({
                quantity: equipment.quantity - item.quantity
              });
          }
    
          // Step 6: Clear the user's cart
          await trx('public.cart')
            .where('user_id', UserId)
            .del(); // Delete all items from the cart for the user
    
          // Commit the transaction
          await trx.commit();
    
          return res.status(201).json({
            message: "Order placed successfully.",
            order_ID: orderId
          });
        } catch (err) {
          // Rollback the transaction on failure
          await trx.rollback();
          console.error("Transaction failed:", err.message);
          return res.status(500).send("Failed to place the order.");
        }
      } catch (err) {
        console.error("Error:", err.message);
        return res.status(500).send("An unexpected error occurred.");
      }
    });
    

}
module.exports = {handleStandardUserBackendApi};
