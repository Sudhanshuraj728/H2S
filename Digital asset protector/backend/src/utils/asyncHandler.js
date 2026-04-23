export const asyncHandler = (requestHandler) => {
    // ye ek higher-order function h jo async operations ko handle krta h aur errors ko catch kr deta h
    // taaki try-catch block har jagah likhen na padhe
    
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
        // returnHandler ko execute kr rhe h aur Promise.resolve se usko promise banate h agar promise reject ho to catch me error intercepted hoga aur next(err) se error middleware ko pass kr denge
    };
};

// Example usage:
// export const loginUser = asyncHandler(async (req, res) => {
//   // koi bhi error throw hoga to ye asyncHandler usko catch kr lega aur next(err) ko pass kr dega
// });

// ye asyncHandler isliye use hota h:
// 1. Har function me try-catch likhen na padhe
// 2. Code cleaner aur readable hota h
// 3. Consistent error handling milti h
// 4. Express error middleware ko error pass ho jati h

