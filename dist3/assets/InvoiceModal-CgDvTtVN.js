const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-jspdf-D1gds-tM.js","assets/vendor-misc-Ia9t9XUU.js"])))=>i.map(i=>d[i]);
import{r as P,o as t}from"./vendor-misc-Ia9t9XUU.js";import{s as k,by as ie,bz as ne,bA as ae,bB as re,bC as oe,bD as se,bE as le,bF as ce,bG as de,bH as me,bI as Z,a6 as S}from"./index-Ct0gIiCJ.js";import{_ as K}from"./vendor-jspdf-D1gds-tM.js";import{Y as ge,z as Q,aV as he,X as pe}from"./vendor-lucide-ZZwuvMeV.js";async function fe(p){var T,L,$,V;const[y,x,a]=await Promise.all([k.from("orders").select(`
        id,
        order_number,
        order_date,
        requested_delivery_date,
        scheduled_delivery_date,
        delivery_notes,
        internal_notes,
        total_amount,
        customers:customer_id (
          name,
          license_name,
          license_number,
          ato_number,
          delivery_address,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          address,
          city,
          state,
          postal_code,
          account_credit_balance
        )
      `).eq("id",p).single(),k.from("order_items").select(`
        id,
        quantity,
        unit_price,
        subtotal,
        discount_amount,
        notes,
        batch_id,
        products:product_id (
          name,
          strain,
          pricing_unit,
          product_category,
          type
        )
      `).eq("order_id",p),ie()]);if(y.error)throw y.error;if(x.error)throw x.error;const l=y.data,g=x.data||[],e=l.customers,w=Array.from(new Set(g.map(i=>i.batch_id).filter(Boolean))),f=new Map,o=new Map;if(w.length>0){const[i,n]=await Promise.all([k.from("batch_registry").select("id, batch_number, strain, harvest_date").in("id",w),k.from("certificates_of_analysis").select("batch_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date").in("batch_id",w).eq("is_active",!0)]);(T=i.data)==null||T.forEach(r=>{f.set(r.id,r)}),(L=n.data)==null||L.forEach(r=>{r.batch_id&&o.set(r.batch_id,r)})}const c=await k.from("package_assignments").select(`
      order_item_id,
      package_id,
      quantity_assigned,
      status
    `).eq("order_id",p).in("status",["reserved","fulfilled"]),u=new Map;($=c.data)==null||$.forEach(i=>{const n=u.get(i.order_item_id)||[];u.set(i.order_item_id,[...n,i])});const j=Array.from(new Set(((V=c.data)==null?void 0:V.map(i=>i.package_id))||[]));let d=new Map;if(j.length>0){const{data:i}=await k.from("inventory_items").select("id, package_id, batch, batch_number, sku, net_weight, thc_percentage, strain, batch_id").in("package_id",j);i==null||i.forEach(r=>{d.set(r.package_id,r)});const n=Array.from(new Set((i||[]).map(r=>r.batch_id).filter(Boolean))).filter(r=>!f.has(r));if(n.length>0){const{data:r}=await k.from("batch_registry").select("id, batch_number, strain, harvest_date").in("id",n);r==null||r.forEach(b=>{f.set(b.id,b)});const{data:z}=await k.from("certificates_of_analysis").select("batch_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date").in("batch_id",n).eq("is_active",!0);z==null||z.forEach(b=>{b.batch_id&&!o.has(b.batch_id)&&o.set(b.batch_id,b)})}}const _=Array.from(new Set(g.map(i=>{var n;return(n=i.products)==null?void 0:n.strain}).filter(Boolean))),D=new Map;if(_.length>0){const{data:i}=await k.from("strains").select("name, dominance_type, genetics_description").in("name",_);i==null||i.forEach(n=>{D.set(n.name,{name:n.name,type:n.dominance_type,genetics:n.genetics_description})})}const E=await Promise.all(g.map(async i=>{const n=i.products,r=u.get(i.id)||[];let z=null,b=null,F=null,N=null;if(i.batch_id){const M=f.get(i.batch_id);M&&(b=M.batch_number,N=M.harvest_date||null);const h=o.get(i.batch_id);h&&(F=h.thc_percentage,!N&&h.harvest_date&&(N=h.harvest_date))}if(r.length>0){const M=r[0],h=d.get(M.package_id);if(h&&(z=h.package_id,b||(b=h.batch_number||h.batch),F||(F=h.thc_percentage),h.batch_id)){const X=f.get(h.batch_id);X&&!N&&(N=X.harvest_date||null);const R=o.get(h.batch_id);R&&(!N&&R.harvest_date&&(N=R.harvest_date),!F&&R.thc_percentage&&(F=R.thc_percentage))}}const W=n==null?void 0:n.strain,I=W?D.get(W):null,J=i.discount_amount||0,te=i.subtotal-J;return{id:i.id,product_name:(n==null?void 0:n.name)||"Unknown Product",package_id:z,batch_number:b,quantity:i.quantity,unit:(n==null?void 0:n.pricing_unit)||"unit",unit_price:i.unit_price,subtotal:i.subtotal,discount:J,total:te,strain:W||null,product_category:(n==null?void 0:n.product_category)||"packaged",strain_dominance:(I==null?void 0:I.type)||null,strain_lineage:(I==null?void 0:I.genetics)||null,thc_percentage:F,harvest_date:N}})),C=E.reduce((i,n)=>i+n.subtotal,0),U=E.reduce((i,n)=>i+n.discount,0),q=(e==null?void 0:e.account_credit_balance)||0,m=C-U-q,B=l.order_number.replace("ORD-","INV-"),O=l.order_number.split("-").pop()||"",s=l.scheduled_delivery_date||l.requested_delivery_date,A=(e==null?void 0:e.license_number)||(e==null?void 0:e.ato_number)||null,Y=(e==null?void 0:e.delivery_address)||(e==null?void 0:e.address)||null,H=(e==null?void 0:e.delivery_city)||(e==null?void 0:e.city)||null,G=(e==null?void 0:e.delivery_state)||(e==null?void 0:e.state)||null,v=(e==null?void 0:e.delivery_postal_code)||(e==null?void 0:e.postal_code)||null;return{invoice_number:B,invoice_id:O,order_number:l.order_number,order_date:l.order_date,estimated_delivery_date:s,company_brand_name:a.company_brand_name||me,company_entity_name:a.company_entity_name||de,company_name:a.company_name||ce,company_license_name:a.company_license_name||le,company_address:a.company_address||se,company_city:a.company_city||oe,company_state:a.company_state||re,company_postal_code:a.company_postal_code||ae,company_license_number:a.company_license_number||ne,company_logo_path:a.logo_invoice_url||a.logo_dark_url||"",customer_name:(e==null?void 0:e.name)||"Unknown Customer",customer_license_name:(e==null?void 0:e.license_name)||null,customer_license_number:A,customer_delivery_address:Y,customer_delivery_city:H,customer_delivery_state:G,customer_delivery_postal_code:v,line_items:E,subtotal:C,discounts:U,credit:q,grand_total:m,notes:l.internal_notes}}async function ue(p,y={}){const{filename:x="document.pdf",scale:a=2,quality:l=.95}=y;try{const[g,{jsPDF:e}]=await Promise.all([K(()=>import("./vendor-html2canvas-CBrSDip1.js"),[]),K(()=>import("./vendor-jspdf-D1gds-tM.js").then(d=>d.j),__vite__mapDeps([0,1]))]),w=g.default,f=await w(p,{scale:a,useCORS:!0,allowTaint:!1,backgroundColor:"#ffffff",logging:!1,imageTimeout:15e3,onclone:d=>{const _=d.querySelector(".invoice-container");_&&(_.style.transform="scale(1)")}}),o=8.5,c=f.height*o/f.width,u=new e({orientation:(c>11,"portrait"),unit:"in",format:"letter"}),j=f.toDataURL("image/jpeg",l);if(c<=11)u.addImage(j,"JPEG",0,0,o,c);else{let d=c,_=0;const D=11;for(u.addImage(j,"JPEG",0,_,o,c),d-=D;d>0;)_=d-c,u.addPage(),u.addImage(j,"JPEG",0,_,o,c),d-=D}u.save(x)}catch(g){throw console.error("PDF generation error:",g),new Error("Failed to generate PDF. Please try again.")}}function ee(p){return p.replace(/[^a-zA-Z0-9-_\s]/g,"").replace(/\s+/g,"_").substring(0,200)}function _e(p,y){const x=ee(y),a=ee(p),l=new Date().toISOString().split("T")[0];return`${a}_${x}_${l}.pdf`}function ve({orderId:p,orderNumber:y,onClose:x}){const[a,l]=P.useState(null),[g,e]=P.useState(!0),[w,f]=P.useState(null),[o,c]=P.useState(!1),[u,j]=P.useState(!1),[d,_]=P.useState(!1),D=P.useRef(null),E=P.useRef(null);P.useEffect(()=>{C()},[p]);async function C(){try{e(!0),f(null);const m=await fe(p);l(m),c(!1)}catch(m){console.error("Error generating invoice:",m),f("Failed to generate invoice. Please try again.")}finally{e(!1)}}P.useEffect(()=>{a&&!g&&setTimeout(()=>{c(!0)},800)},[a,g]);async function U(){var m,B,O;if(!E.current){S.warning("Print area not ready. Please try again.");return}if(!o){S.warning("Please wait for the invoice to finish loading...");return}j(!0);try{const s=document.createElement("iframe");s.style.position="fixed",s.style.right="0",s.style.bottom="0",s.style.width="0",s.style.height="0",s.style.border="none",document.body.appendChild(s);const A=s.contentDocument||((m=s.contentWindow)==null?void 0:m.document);if(!A)throw new Error("Could not access iframe document");const Y=`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${(a==null?void 0:a.invoice_number)||y}</title>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: letter;
              margin: 0.5in;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              background: white !important;
            }
            body {
              font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.5;
              color: #000000;
            }
            img {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              max-width: 100%;
              height: auto;
            }

            /* Utility Classes - Layout */
            .bg-white { background-color: #ffffff !important; }
            .text-black { color: #000000 !important; }
            .p-8 { padding: 2rem; }
            .min-h-[11in] { min-height: 11in; }
            .flex { display: flex; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-0.5, .mt-0 { margin-top: 0.125rem; }
            .ml-8 { margin-left: 2rem; }
            .ml-auto { margin-left: auto; }
            .flex-shrink-0 { flex-shrink: 0; }
            .flex-1 { flex: 1 1 0%; }

            /* Grid */
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-8 { gap: 2rem; }

            /* Text Alignment */
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }

            /* Font Sizes */
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-base { font-size: 1rem; line-height: 1.5rem; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }

            /* Font Weights */
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }

            /* Colors */
            .text-cult-text-muted { color: #374151; }
            .text-cult-text-faint { color: #4B5563; }

            /* Width */
            .w-full { width: 100%; }
            .w-64 { width: 16rem; }
            .w-auto { width: auto; }

            /* Height */
            .h-48 { height: 12rem; }

            /* Padding */
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .pr-4 { padding-right: 1rem; }

            /* Alignment */
            .align-top { vertical-align: top; }

            /* Borders */
            .border-t-2 { border-top-width: 2px; border-top-style: solid; }
            .border-b-2 { border-bottom-width: 2px; border-bottom-style: solid; }
            .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
            .border-black { border-color: #000000; }

            /* Table Specific */
            table { border-collapse: collapse; width: 100%; }
            th, td { text-align: inherit; }

            /* Specific Invoice Styles */
            .invoice-container {
              background-color: #ffffff;
              color: #000000;
              padding: 2rem;
              min-height: 11in;
              width: 8.5in;
              margin: 0 auto;
            }

            .invoice-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              margin-bottom: 2rem;
            }

            .invoice-logo {
              flex-shrink: 0;
            }

            .invoice-logo img {
              height: 12rem;
              width: auto;
              margin-bottom: 1rem;
              max-height: 240px;
            }

            .invoice-company-info {
              text-align: right;
            }

            .company-brand-name {
              font-weight: 700;
              font-size: 1.25rem;
              line-height: 1.75rem;
            }

            .company-entity-name {
              font-size: 0.875rem;
              line-height: 1.25rem;
              font-weight: 600;
            }

            .company-license-name {
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .company-license-number {
              font-size: 0.75rem;
              line-height: 1rem;
            }

            .company-address {
              font-size: 0.875rem;
              line-height: 1.25rem;
              margin-top: 0.5rem;
            }

            .invoice-details-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 2rem;
              margin-bottom: 2rem;
            }

            .sold-to-section .section-title {
              font-weight: 700;
              margin-bottom: 0.5rem;
            }

            .sold-to-section .customer-name {
              font-weight: 600;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .sold-to-section .customer-address {
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .sold-to-section .customer-license-info {
              margin-top: 0.5rem;
              font-size: 0.75rem;
              line-height: 1rem;
            }

            .invoice-meta {
              text-align: right;
            }

            .invoice-meta table {
              margin-left: auto;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .invoice-meta td:first-child {
              font-weight: 700;
              padding-right: 1rem;
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
            }

            .invoice-meta td:last-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
            }

            .line-items-table {
              width: 100%;
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              margin-bottom: 1.5rem;
            }

            .line-items-table thead tr {
              border-bottom: 1px solid #000000;
            }

            .line-items-table th {
              text-align: left;
              padding: 0.5rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
              font-weight: 700;
            }

            .line-items-table th.text-right {
              text-align: right;
            }

            .line-items-table td {
              padding: 0.5rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
              vertical-align: top;
            }

            .line-items-table td.text-right {
              text-align: right;
            }

            .product-name {
              font-weight: 600;
            }

            .strain-info {
              font-size: 0.75rem;
              line-height: 1rem;
              color: #374151;
              margin-top: 0.125rem;
            }

            .batch-info {
              font-size: 0.75rem;
              line-height: 1rem;
              color: #4B5563;
              margin-top: 0.125rem;
              font-weight: 500;
            }

            .line-item-total {
              font-weight: 600;
            }

            .invoice-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }

            .notes-section {
              flex: 1 1 0%;
            }

            .notes-section .notes-title {
              font-weight: 700;
              font-size: 0.875rem;
              line-height: 1.25rem;
              margin-bottom: 0.25rem;
            }

            .notes-section .notes-content {
              font-size: 0.875rem;
              line-height: 1.25rem;
              color: #374151;
            }

            .originator-license {
              margin-top: 1rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .originator-license .label {
              font-weight: 700;
            }

            .totals-section {
              width: 16rem;
              margin-left: 2rem;
            }

            .totals-section table {
              width: 100%;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .totals-section td:first-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
              padding-right: 1rem;
              text-align: right;
              font-weight: 700;
            }

            .totals-section td:last-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
              text-align: right;
            }

            .totals-section .grand-total-row {
              border-top: 2px solid #000000;
            }

            .totals-section .grand-total-row td {
              padding-top: 0.5rem;
              padding-bottom: 0.5rem;
              font-weight: 700;
              font-size: 1rem;
              line-height: 1.5rem;
            }
          </style>
        </head>
        <body>
          ${E.current.innerHTML}
        </body>
        </html>
      `;A.open(),A.write(Y),A.close(),await new Promise(v=>setTimeout(v,500));const H=A.getElementsByTagName("img"),G=Array.from(H).map(v=>v.complete&&v.naturalHeight!==0?Promise.resolve():new Promise(T=>{const L=setTimeout(()=>T(null),3e3);v.onload=()=>{clearTimeout(L),T(null)},v.onerror=()=>{clearTimeout(L),T(null)}}));await Promise.all(G),await new Promise(v=>setTimeout(v,500)),(B=s.contentWindow)==null||B.focus(),(O=s.contentWindow)==null||O.print(),setTimeout(()=>document.body.removeChild(s),1e3)}catch(s){console.error("Print error:",s),S.error("An error occurred while printing. Please try again.")}finally{j(!1)}}async function q(){if(!E.current||!a){S.warning("Invoice not ready. Please try again.");return}if(!o){S.warning("Please wait for the invoice to finish loading...");return}_(!0);try{const m=_e(a.invoice_number,a.customer_name);await ue(E.current,{filename:m,scale:2,quality:.95})}catch(m){console.error("PDF download error:",m),S.error("Failed to download PDF. Please try again or use the Print button.")}finally{_(!1)}}return t.jsx("div",{className:"fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4",onClick:x,children:t.jsxs("div",{className:"bg-cult-dark-gray border-2 border-cult-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col",onClick:m=>m.stopPropagation(),children:[t.jsxs("div",{className:"flex items-center justify-between p-6 border-b-2 border-cult-medium-gray bg-cult-near-black",children:[t.jsxs("div",{children:[t.jsx("h2",{className:"text-2xl font-bold text-cult-white uppercase tracking-wide",children:"Invoice Preview"}),t.jsxs("p",{className:"text-cult-light-gray text-sm mt-1",children:["Order: ",y]})]}),t.jsxs("div",{className:"flex items-center gap-3",children:[!g&&!w&&t.jsxs(t.Fragment,{children:[t.jsxs("button",{onClick:U,disabled:!o||u,className:"flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed",title:"Print Invoice",children:[t.jsx(ge,{className:"w-4 h-4"}),u?"Printing...":o?"Print":"Loading..."]}),t.jsx("button",{onClick:q,disabled:!o||d,className:"flex items-center gap-2 px-4 py-2 border-2 border-cult-white text-cult-white hover:bg-cult-white hover:text-cult-black transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed",title:"Download PDF",children:d?t.jsxs(t.Fragment,{children:[t.jsx(Q,{className:"w-4 h-4 animate-spin"}),"Generating..."]}):t.jsxs(t.Fragment,{children:[t.jsx(he,{className:"w-4 h-4"}),"Download"]})})]}),t.jsx("button",{onClick:x,className:"p-2 text-cult-light-gray hover:text-cult-white hover:bg-cult-medium-gray transition-all",title:"Close",children:t.jsx(pe,{className:"w-6 h-6"})})]})]}),t.jsxs("div",{className:"flex-1 overflow-auto p-6 bg-cult-black",children:[g&&t.jsx("div",{className:"flex items-center justify-center h-64",children:t.jsxs("div",{className:"flex flex-col items-center gap-3",children:[t.jsx(Q,{className:"w-8 h-8 text-cult-white animate-spin"}),t.jsx("p",{className:"text-cult-light-gray",children:"Generating invoice..."})]})}),w&&t.jsx("div",{className:"flex items-center justify-center h-64",children:t.jsxs("div",{className:"bg-red-900/30 border-2 border-red-600 text-red-400 p-6 rounded max-w-md text-center",children:[t.jsx("p",{className:"font-semibold mb-2",children:"Error"}),t.jsx("p",{className:"text-sm",children:w}),t.jsx("button",{onClick:C,className:"mt-4 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all text-sm uppercase tracking-wider",children:"Retry"})]})}),!g&&!w&&a&&t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"flex justify-center",children:t.jsx("div",{className:"shadow-2xl",children:t.jsx(Z,{ref:D,invoiceData:a,onImagesLoaded:()=>c(!0)})})}),t.jsx("div",{style:{display:"none"},children:t.jsx(Z,{ref:E,invoiceData:a,forPrint:!0})})]})]})]})})}export{ve as I};
