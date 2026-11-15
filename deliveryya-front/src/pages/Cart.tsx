import NavBar from "../page_comps/home/NavBar";
import Footer from "../page_comps/home/Footer";
import CartMain from "../page_comps/cart/CartMain";

const Cart = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <NavBar />
            <main className="flex-1">
                <CartMain />
            </main>
            <Footer />
        </div>
    );
};

export default Cart;
 