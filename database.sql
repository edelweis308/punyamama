CREATE TABLE nasabah (
    id_nasabah SERIAL PRIMARY KEY,
    nama_nasabah VARCHAR(100) NOT NULL,
    no_telepon VARCHAR(20),
    alamat TEXT,
    no_rekening VARCHAR(50),
    nama_bank VARCHAR(100),
    tanggal_daftar DATE DEFAULT CURRENT_DATE
);

CREATE TABLE petugas (
    id_petugas SERIAL PRIMARY KEY,
    nama_petugas VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO petugas (nama_petugas)
VALUES ('Bapak'), ('Mama'), ('Tiara'), ('Yoan');

CREATE TABLE pinjaman (
    id_pinjaman SERIAL PRIMARY KEY,
    id_nasabah INTEGER NOT NULL,
    id_petugas INTEGER NOT NULL,
    tanggal_pinjaman DATE DEFAULT CURRENT_DATE,
    jumlah_pinjaman NUMERIC(15,2) NOT NULL,
    bunga NUMERIC(5,2) DEFAULT 0,
    lama_pinjaman INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'Berjalan',

    CONSTRAINT fk_pinjaman_nasabah
        FOREIGN KEY (id_nasabah)
        REFERENCES nasabah(id_nasabah)
        ON DELETE CASCADE,

    CONSTRAINT fk_pinjaman_petugas
        FOREIGN KEY (id_petugas)
        REFERENCES petugas(id_petugas)
        ON DELETE CASCADE
);

CREATE TABLE pembayaran (
    id_pembayaran SERIAL PRIMARY KEY,
    id_pinjaman INTEGER NOT NULL,
    tanggal_bayar DATE DEFAULT CURRENT_DATE,
    jumlah_bayar NUMERIC(15,2) NOT NULL,
    keterangan TEXT,

    CONSTRAINT fk_pembayaran_pinjaman
        FOREIGN KEY (id_pinjaman)
        REFERENCES pinjaman(id_pinjaman)
        ON DELETE CASCADE
);