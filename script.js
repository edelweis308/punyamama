import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


import {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
} from "../../backend/supabase/config.js";


const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


let dataNasabah = [];
let dataPetugas = [];
let dataPinjaman = [];
let dataPembayaran = [];
const namaPetugasTetap = ["Bapak", "Mama", "Tiara", "Yoan"];



/* ======================================
   FORMAT RUPIAH
====================================== */

function formatRupiah(angka) {

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }
    ).format(angka);

}


function calculateInterest(pinjaman) {

    const modal = Number(pinjaman.jumlah_pinjaman) || 0;
    const bungaBulanan = Number(pinjaman.bunga) || 0;
    const lamaBulan = Number(pinjaman.lama_pinjaman) || 0;

    return Math.round(
        modal * bungaBulanan * lamaBulan
    ) / 100;

}


function calculateLoanTotal(pinjaman) {

    return Number(pinjaman.jumlah_pinjaman) +
        calculateInterest(pinjaman);

}


function calculateTotalPaid(idPinjaman, exceptId = null) {

    return dataPembayaran.reduce(
        (total, pembayaran) => {
            const isSameLoan =
                Number(pembayaran.id_pinjaman) === Number(idPinjaman);
            const isExcluded =
                exceptId !== null &&
                Number(pembayaran.id_pembayaran) === Number(exceptId);

            return isSameLoan && !isExcluded
                ? total + Number(pembayaran.jumlah_bayar)
                : total;
        },
        0
    );

}


function calculateLoanBalance(pinjaman, exceptPaymentId = null) {

    return Math.max(
        calculateLoanTotal(pinjaman) -
            calculateTotalPaid(pinjaman.id_pinjaman, exceptPaymentId),
        0
    );

}



/* ======================================
   LOAD SEMUA DATA
====================================== */

async function loadData() {

    const status = document.getElementById("appStatus");
    const main = document.querySelector("#systemContent main.container");

    status.textContent = "Memuat data dari database...";
    status.dataset.state = "loading";

    try {
        await Promise.all([
            loadNasabah(),
            loadPetugas(),
            loadPinjaman(),
            loadPembayaran()
        ]);

        status.textContent = "Data siap digunakan.";
        status.dataset.state = "ready";
    } catch (error) {
        console.error(error);
        status.textContent = `Data gagal dimuat: ${error.message}. Periksa koneksi internet dan konfigurasi Supabase.`;
        status.dataset.state = "error";
    } finally {
        main.removeAttribute("inert");
    }

}



/* ======================================
   NASABAH
====================================== */

async function loadNasabah() {

    const { data, error } =
        await supabase
            .from("nasabah")
            .select("*")
            .order("id_nasabah");


    if (error) {

        console.error(error);

        throw error;

    }


    dataNasabah = data;

    tampilkanNasabah();

    updateDashboard();

}



function tampilkanNasabah() {

    const table =
        document.getElementById(
            "nasabahTable"
        );


    table.innerHTML = "";


    dataNasabah.forEach(
        nasabah => {

            table.innerHTML += `

                <tr>

                    <td>
                        ${nasabah.id_nasabah}
                    </td>

                    <td>
                        ${nasabah.nama_nasabah}
                    </td>

                    <td>
                        ${nasabah.no_telepon || "-"}
                    </td>

                    <td>
                        ${nasabah.alamat || "-"}
                    </td>

                    <td>
                        ${nasabah.no_rekening || "-"}
                    </td>

                    <td>
                        ${nasabah.nama_bank || "-"}
                    </td>

                    <td>

                        <button
                            class="action-button"
                            onclick="
                                editNasabah(
                                    ${nasabah.id_nasabah}
                                )
                            ">

                            Edit

                        </button>


                        <button
                            class="action-button delete"
                            onclick="
                                hapusNasabah(
                                    ${nasabah.id_nasabah}
                                )
                            ">

                            Hapus

                        </button>

                    </td>

                </tr>

            `;

        }
    );

}



function isiSelectNasabah() {

    const select =
        document.getElementById(
            "pinjamanNasabah"
        );


    select.innerHTML = `
        <option value="">
            Pilih Nasabah
        </option>
    `;


    dataNasabah.forEach(
        nasabah => {

            select.innerHTML += `

                <option
                    value="${nasabah.id_nasabah}">

                    ${nasabah.nama_nasabah}

                </option>

            `;

        }
    );

}


function updateOtherBankField() {

    const bankSelect = document.getElementById("bankNasabah");
    const otherBank = document.getElementById("bankLainnya");
    const showOtherBank = bankSelect.value === "Lainnya";

    otherBank.hidden = !showOtherBank;
    otherBank.required = showOtherBank;

    if (!showOtherBank) {
        otherBank.value = "";
    }

}


document
    .getElementById("bankNasabah")
    .addEventListener("change", updateOtherBankField);



document
    .getElementById("nasabahForm")
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "idNasabah"
                ).value;

            const pilihanBank =
                document.getElementById("bankNasabah").value;
            const namaBankLainnya =
                document.getElementById("bankLainnya").value.trim();

            if (pilihanBank === "Lainnya" && !namaBankLainnya) {
                document.getElementById("bankLainnya").focus();
                return;
            }

            const namaBank = pilihanBank === "Lainnya"
                ? namaBankLainnya
                : pilihanBank;

            const data = {

                nama_nasabah:
                    document.getElementById(
                        "namaNasabah"
                    ).value,

                no_telepon:
                    document.getElementById(
                        "noTelepon"
                    ).value,

                alamat:
                    document.getElementById(
                        "alamat"
                    ).value,

                no_rekening:
                    document.getElementById(
                        "noRekening"
                    ).value.trim(),

                nama_bank: namaBank || null

            };


            let result;


            if (id) {

                result =
                    await supabase
                        .from("nasabah")
                        .update(data)
                        .eq(
                            "id_nasabah",
                            id
                        );

            } else {

                result =
                    await supabase
                        .from("nasabah")
                        .insert(data);

            }


            if (result.error) {

                const needsBankColumns =
                    ["PGRST204", "42703"].includes(result.error.code) &&
                    /no_rekening|nama_bank/i.test(result.error.message);

                alert(needsBankColumns
                    ? "Kolom rekening dan bank belum tersedia di database. Jalankan database/add_nasabah_bank_details.sql di Supabase SQL Editor."
                    : result.error.message);

                return;

            }


            alert(
                "Data nasabah berhasil disimpan"
            );


            this.reset();

            updateOtherBankField();


            document.getElementById(
                "idNasabah"
            ).value = "";


            await loadData();

        }
    );



window.editNasabah =
    function(id) {

        const nasabah =
            dataNasabah.find(
                x =>
                    x.id_nasabah == id
            );


        document.getElementById(
            "idNasabah"
        ).value =
            nasabah.id_nasabah;


        document.getElementById(
            "namaNasabah"
        ).value =
            nasabah.nama_nasabah;


        document.getElementById(
            "noTelepon"
        ).value =
            nasabah.no_telepon || "";


        document.getElementById(
            "alamat"
        ).value =
            nasabah.alamat || "";


        document.getElementById(
            "noRekening"
        ).value =
            nasabah.no_rekening || "";


        const daftarBank = [
            "Bank DKI",
            "BCA",
            "Mandiri",
            "BNI",
            "BTN",
            "BRI"
        ];
        const bankTersimpan = nasabah.nama_bank || "";
        const bankDikenal = daftarBank.includes(bankTersimpan);

        document.getElementById("bankNasabah").value = bankDikenal
            ? bankTersimpan
            : bankTersimpan
                ? "Lainnya"
                : "";
        document.getElementById("bankLainnya").value = bankDikenal
            ? ""
            : bankTersimpan;

        updateOtherBankField();

    };



window.hapusNasabah =
    async function(id) {

        if (
            !confirm(
                "Yakin ingin menghapus nasabah?"
            )
        ) {

            return;

        }


        const { error } =
            await supabase
                .from("nasabah")
                .delete()
                .eq(
                    "id_nasabah",
                    id
                );


        if (error) {

            alert(error.message);

            return;

        }


        loadData();

    };



/* ======================================
   PETUGAS
====================================== */

async function loadPetugas() {

    let { data, error } =
        await supabase
            .from("petugas")
            .select("*")
            .order("id_petugas");


    if (error) {

        console.error(error);

        throw error;

    }


    const namesAvailable = new Set(
        data.map(petugas => petugas.nama_petugas)
    );
    const namesMissing = namaPetugasTetap.filter(
        name => !namesAvailable.has(name)
    );

    if (namesMissing.length) {
        const legacyRows = namesMissing.map(name => ({
            nama_petugas: name,
            username: `petugas_${name.toLowerCase()}`
        }));
        let { error: seedError } = await supabase
            .from("petugas")
            .insert(legacyRows);

        if (
            seedError &&
            (seedError.code === "PGRST204" ||
                /username.*(column|schema cache)/i.test(seedError.message))
        ) {
            ({ error: seedError } = await supabase
                .from("petugas")
                .insert(namesMissing.map(name => ({ nama_petugas: name }))));
        }

        if (seedError && seedError.code !== "23505") {
            throw seedError;
        }

        const refreshed = await supabase
            .from("petugas")
            .select("*")
            .order("id_petugas");

        if (refreshed.error) {
            throw refreshed.error;
        }

        data = refreshed.data;
    }

    dataPetugas = data.filter(
        petugas => namaPetugasTetap.includes(petugas.nama_petugas)
    );

    isiSelectPetugas();

}


function isiSelectPetugas() {

    const select = document.getElementById("pinjamanPetugas");
    select.innerHTML = '<option value="">Pilih Petugas</option>';

    dataPetugas.forEach(petugas => {
        const option = document.createElement("option");
        option.value = petugas.id_petugas;
        option.textContent = petugas.nama_petugas;
        select.append(option);
    });

}


/* ======================================
   PINJAMAN
====================================== */

async function loadPinjaman() {

    const { data, error } =
        await supabase
            .from("pinjaman")
            .select(`
                *,
                nasabah (
                    nama_nasabah
                ),
                petugas (
                    nama_petugas
                )
            `)
            .order(
                "id_pinjaman",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);

        throw error;

    }


    dataPinjaman = data;

    tampilkanPinjaman();

    updateDashboard();

}



function tampilkanPinjaman() {

    const table =
        document.getElementById(
            "pinjamanTable"
        );


    table.innerHTML = "";


    dataPinjaman.forEach(
        pinjaman => {

            table.innerHTML += `

                <tr>

                    <td>
                        ${pinjaman.id_pinjaman}
                    </td>

                    <td>
                        ${pinjaman.nasabah?.nama_nasabah || "-"}
                    </td>

                    <td>
                        ${pinjaman.petugas?.nama_petugas || "-"}
                    </td>

                    <td>
                        ${pinjaman.tanggal_pinjaman}
                    </td>

                    <td>
                        ${formatRupiah(
                            pinjaman.jumlah_pinjaman
                        )}
                    </td>

                    <td>
                        ${pinjaman.bunga}% / bln
                    </td>

                    <td>
                        ${formatRupiah(calculateInterest(pinjaman))}
                    </td>

                    <td>
                        ${formatRupiah(calculateLoanTotal(pinjaman))}
                    </td>

                    <td>
                        ${formatRupiah(calculateTotalPaid(pinjaman.id_pinjaman))}
                    </td>

                    <td>
                        ${formatRupiah(calculateLoanBalance(pinjaman))}
                    </td>

                    <td>
                        ${calculateLoanBalance(pinjaman) <= 0.005 ? "Lunas" : pinjaman.status}
                    </td>

                    <td>

                        <button
                            class="action-button"
                            onclick="
                                editPinjaman(
                                    ${pinjaman.id_pinjaman}
                                )
                            ">

                            Edit

                        </button>


                        <button
                            class="action-button delete"
                            onclick="
                                hapusPinjaman(
                                    ${pinjaman.id_pinjaman}
                                )
                            ">

                            Hapus

                        </button>

                    </td>

                </tr>

            `;

        }
    );

}



function updateLoanSummary() {

    const modal = Number(
        document.getElementById("jumlahPinjaman").value
    );
    const bunga = Number(
        document.getElementById("bunga").value
    );
    const lama = Number(
        document.getElementById("lamaPinjaman").value
    );
    const summary = document.getElementById("ringkasanPinjaman");

    if (!modal || !bunga || !lama) {
        summary.textContent =
            "Isi modal, bunga bulanan, dan lama pinjaman untuk melihat total tagihan.";
        return;
    }

    const bungaTotal = calculateInterest({
        jumlah_pinjaman: modal,
        bunga,
        lama_pinjaman: lama
    });
    const total = modal + bungaTotal;

    summary.textContent =
        `Modal ${formatRupiah(modal)} + bunga ${formatRupiah(bungaTotal)} ` +
        `(${bunga}% x ${lama} bulan) = total ${formatRupiah(total)} ` +
        `atau ${formatRupiah(total / lama)} per bulan.`;

}


function updatePaymentBalance() {

    const loanInput = document.getElementById("pembayaranPinjaman");
    const amountInput = document.getElementById("jumlahBayar");
    const summary = document.getElementById("sisaPembayaran");
    const enteredId = loanInput.value.trim().replace(/^#/, "");
    const loanId = /^\d+$/.test(enteredId) ? Number(enteredId) : null;
    const pinjaman = dataPinjaman.find(
        item => Number(item.id_pinjaman) === loanId
    );

    if (!pinjaman) {
        amountInput.removeAttribute("max");
        summary.textContent = "Ketik ID pinjaman yang terdaftar untuk melihat sisa tagihan.";
        return;
    }

    const paymentId =
        document.getElementById("idPembayaran").value || null;
    const remaining = calculateLoanBalance(pinjaman, paymentId);

    amountInput.max = remaining.toFixed(2);
    summary.textContent =
        `Sisa tagihan yang dapat dibayar: ${formatRupiah(remaining)}.`;

}


document
    .getElementById("jumlahPinjaman")
    .addEventListener("input", updateLoanSummary);

document
    .getElementById("bunga")
    .addEventListener("input", updateLoanSummary);

document
    .getElementById("lamaPinjaman")
    .addEventListener("input", updateLoanSummary);

document
    .getElementById("pembayaranPinjaman")
    .addEventListener("input", updatePaymentBalance);



document
    .getElementById("pinjamanForm")
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "idPinjaman"
                ).value;

            const namaNasabah = document.getElementById(
                "pinjamanNasabah"
            ).value.trim();
            const nasabah = dataNasabah.find(
                item => item.nama_nasabah.trim().toLocaleLowerCase() ===
                    namaNasabah.toLocaleLowerCase()
            );

            if (!nasabah) {
                alert("Nama nasabah belum terdaftar. Simpan datanya di bagian Data Nasabah terlebih dahulu.");
                document.getElementById("pinjamanNasabah").focus();
                return;
            }

            const data = {

                id_nasabah: nasabah.id_nasabah,

                id_petugas:
                    document.getElementById(
                        "pinjamanPetugas"
                    ).value,

                tanggal_pinjaman:
                    document.getElementById(
                        "tanggalPinjaman"
                    ).value,

                jumlah_pinjaman:
                    document.getElementById(
                        "jumlahPinjaman"
                    ).value,

                bunga:
                    document.getElementById(
                        "bunga"
                    ).value,

                lama_pinjaman:
                    document.getElementById(
                        "lamaPinjaman"
                    ).value,

                status:
                    document.getElementById(
                        "statusPinjaman"
                    ).value

            };


            let result;


            if (id) {

                result =
                    await supabase
                        .from("pinjaman")
                        .update(data)
                        .eq(
                            "id_pinjaman",
                            id
                        );

            } else {

                result =
                    await supabase
                        .from("pinjaman")
                        .insert(data);

            }


            if (result.error) {

                alert(
                    result.error.message
                );

                return;

            }


            alert(
                "Data pinjaman berhasil disimpan"
            );


            this.reset();

            updateLoanSummary();


            document.getElementById(
                "idPinjaman"
            ).value = "";


            await loadData();

        }
    );



window.editPinjaman =
    function(id) {

        const p =
            dataPinjaman.find(
                x =>
                    x.id_pinjaman == id
            );


        document.getElementById(
            "idPinjaman"
        ).value =
            p.id_pinjaman;


        document.getElementById(
            "pinjamanNasabah"
        ).value =
            p.nasabah?.nama_nasabah ||
            dataNasabah.find(
                item => Number(item.id_nasabah) === Number(p.id_nasabah)
            )?.nama_nasabah || "";


        document.getElementById(
            "pinjamanPetugas"
        ).value =
            p.id_petugas;


        document.getElementById(
            "tanggalPinjaman"
        ).value =
            p.tanggal_pinjaman;


        document.getElementById(
            "jumlahPinjaman"
        ).value =
            p.jumlah_pinjaman;


        document.getElementById(
            "bunga"
        ).value =
            p.bunga;


        document.getElementById(
            "lamaPinjaman"
        ).value =
            p.lama_pinjaman;


        document.getElementById(
            "statusPinjaman"
        ).value =
            p.status === "Lunas" || calculateLoanBalance(p) <= 0.005
                ? "Lunas"
                : p.status;

        updateLoanSummary();

    };



window.hapusPinjaman =
    async function(id) {

        if (
            !confirm(
                "Yakin ingin menghapus pinjaman?"
            )
        ) {

            return;

        }


        const { error } =
            await supabase
                .from("pinjaman")
                .delete()
                .eq(
                    "id_pinjaman",
                    id
                );


        if (error) {

            alert(error.message);

            return;

        }


        loadData();

    };



/* ======================================
   PEMBAYARAN
====================================== */

async function loadPembayaran() {

    const { data, error } =
        await supabase
            .from("pembayaran")
            .select("*")
            .order(
                "id_pembayaran",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);

        throw error;

    }


    dataPembayaran = data;

    tampilkanPembayaran();

    tampilkanPinjaman();

    updateDashboard();

    updatePaymentBalance();

}



function tampilkanPembayaran() {

    const table =
        document.getElementById(
            "pembayaranTable"
        );


    table.innerHTML = "";


    dataPembayaran.forEach(
        pembayaran => {

            table.innerHTML += `

                <tr>

                    <td>
                        ${pembayaran.id_pembayaran}
                    </td>

                    <td>
                        ${pembayaran.id_pinjaman}
                    </td>

                    <td>
                        ${pembayaran.tanggal_bayar}
                    </td>

                    <td>
                        ${formatRupiah(
                            pembayaran.jumlah_bayar
                        )}
                    </td>

                    <td>
                        ${pembayaran.keterangan || "-"}
                    </td>

                    <td>

                        <button
                            class="action-button"
                            onclick="
                                editPembayaran(
                                    ${pembayaran.id_pembayaran}
                                )
                            ">

                            Edit

                        </button>


                        <button
                            class="action-button delete"
                            onclick="
                                hapusPembayaran(
                                    ${pembayaran.id_pembayaran}
                                )
                            ">

                            Hapus

                        </button>

                    </td>

                </tr>

            `;

        }
    );

}



document
    .getElementById("pembayaranForm")
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "idPembayaran"
                ).value;


            const data = {

                id_pinjaman: Number(
                    document.getElementById(
                        "pembayaranPinjaman"
                    ).value.trim().replace(/^#/, "")
                ),

                tanggal_bayar:
                    document.getElementById(
                        "tanggalBayar"
                    ).value,

                jumlah_bayar:
                    document.getElementById(
                        "jumlahBayar"
                    ).value,

                keterangan:
                    document.getElementById(
                        "keterangan"
                    ).value

            };


            const pinjaman = dataPinjaman.find(
                item => Number(item.id_pinjaman) === Number(data.id_pinjaman)
            );
            const jumlahBayar = Number(data.jumlah_bayar);
            const sisaTagihan = pinjaman
                ? calculateLoanBalance(pinjaman, id || null)
                : 0;

            if (!pinjaman) {
                alert("Pinjaman tidak ditemukan. Muat ulang data lalu coba lagi.");
                return;
            }

            if (jumlahBayar > sisaTagihan + 0.005) {
                alert(`Pembayaran melebihi sisa tagihan ${formatRupiah(sisaTagihan)}.`);
                return;
            }


            let result;


            if (id) {

                result =
                    await supabase
                        .from("pembayaran")
                        .update(data)
                        .eq(
                            "id_pembayaran",
                            id
                        );

            } else {

                result =
                    await supabase
                        .from("pembayaran")
                        .insert(data);

            }


            if (result.error) {

                alert(
                    result.error.message
                );

                return;

            }


            alert(
                "Pembayaran berhasil disimpan"
            );


            this.reset();


            document.getElementById(
                "idPembayaran"
            ).value = "";


            updatePaymentBalance();


            await loadData();

        }
    );



window.editPembayaran =
    function(id) {

        const p =
            dataPembayaran.find(
                x =>
                    x.id_pembayaran == id
            );


        document.getElementById(
            "idPembayaran"
        ).value =
            p.id_pembayaran;


        document.getElementById(
            "pembayaranPinjaman"
        ).value =
            p.id_pinjaman;


        document.getElementById(
            "tanggalBayar"
        ).value =
            p.tanggal_bayar;


        document.getElementById(
            "jumlahBayar"
        ).value =
            p.jumlah_bayar;


        document.getElementById(
            "keterangan"
        ).value =
            p.keterangan || "";

        updatePaymentBalance();

    };



window.hapusPembayaran =
    async function(id) {

        if (
            !confirm(
                "Yakin ingin menghapus pembayaran?"
            )
        ) {

            return;

        }


        const { error } =
            await supabase
                .from("pembayaran")
                .delete()
                .eq(
                    "id_pembayaran",
                    id
                );


        if (error) {

            alert(error.message);

            return;

        }


        loadData();

    };



/* ======================================
   DASHBOARD
====================================== */

function updateDashboard() {

    document.getElementById(
        "totalNasabah"
    ).textContent =
        dataNasabah.length;


    document.getElementById(
        "totalPinjaman"
    ).textContent =
        dataPinjaman.length;


    const totalTagihan =
        dataPinjaman.reduce(
            (total, data) =>
                total + calculateLoanTotal(data),
            0
        );


    const totalPembayaran =
        dataPembayaran.reduce(
            (total, data) =>
                total +
                Number(
                    data.jumlah_bayar
                ),
            0
        );


    document.getElementById(
        "totalDipinjam"
    ).textContent =
        formatRupiah(
            totalTagihan
        );


    document.getElementById(
        "totalDibayar"
    ).textContent =
        formatRupiah(
            totalPembayaran
        );

}



/* ======================================
   TANGGAL DEFAULT
====================================== */

const today =
    new Date()
        .toISOString()
        .split("T")[0];


document.getElementById(
    "tanggalPinjaman"
).value = today;


document.getElementById(
    "tanggalBayar"
).value = today;


const sectionNav = document.querySelector(".section-nav");
const viewButtons = [...sectionNav.querySelectorAll("[data-view]")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];
const allowedViews = new Set([
    "semua",
    ...viewPanels.map(panel => panel.dataset.viewPanel)
]);

function showView(view, shouldScroll = true) {

    const activeView = allowedViews.has(view) ? view : "ringkasan";
    const showAllPanels = activeView === "semua";

    viewPanels.forEach(panel => {
        panel.hidden = !showAllPanels && panel.dataset.viewPanel !== activeView;
    });

    viewButtons.forEach(button => {
        if (button.dataset.view === activeView) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    if (window.location.hash !== `#${activeView}`) {
        window.history.replaceState(null, "", `#${activeView}`);
    }

    if (shouldScroll) {
        sectionNav.scrollIntoView({ behavior: "smooth", block: "start" });
    }

}


sectionNav.addEventListener("click", event => {
    const button = event.target.closest("[data-view]");

    if (button) {
        showView(button.dataset.view);
    }
});

window.addEventListener("hashchange", () => {
    showView(window.location.hash.slice(1), false);
});

showView(window.location.hash.slice(1), false);



/* ======================================
   JALANKAN SISTEM
====================================== */

const ACCESS_PASSWORD = "benjibruno";
const ACCESS_SESSION_KEY = "sistemPinjamUangMamaTiaraUnlocked";
const accessScreen = document.getElementById("accessScreen");
const systemContent = document.getElementById("systemContent");
const accessForm = document.getElementById("accessForm");
const accessPassword = document.getElementById("accessPassword");
const accessFeedback = document.getElementById("accessFeedback");

function unlockSystem() {

    accessScreen.hidden = true;
    systemContent.hidden = false;
    loadData();

}


accessForm.addEventListener("submit", event => {

    event.preventDefault();

    if (accessPassword.value !== ACCESS_PASSWORD) {
        accessFeedback.textContent = "Kata sandi belum benar. Coba lagi.";
        accessPassword.value = "";
        accessPassword.focus();
        return;
    }

    sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
    accessFeedback.textContent = "";
    accessPassword.value = "";
    unlockSystem();

});


if (sessionStorage.getItem(ACCESS_SESSION_KEY) === "true") {
    unlockSystem();
} else {
    accessPassword.focus();
}